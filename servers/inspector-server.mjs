#!/usr/bin/env node

/**
 * UI Inspector — MCP Server v1.0.0
 *
 * Live preview + element inspector for any web project. Click an element in
 * the browser and Claude can read the code location, computed styles, and
 * UI/UX terminology back through MCP. No external LLM calls — all reasoning
 * happens in Claude itself.
 *
 * Tools (18):
 *   Preview (8):     preview_start, preview_attach, preview_update,
 *                    preview_status, preview_stop, preview_export,
 *                    preview_screenshot, preview_errors
 *   Inspector (4):   preview_select_element, inspector_get_selection,
 *                    inspector_clear_selection, inspector_highlight
 *   Annotation (4):  annotation_list, annotation_resolve,
 *                    annotation_remove, annotation_to_prompt
 *   Knowledge (2):   query_ontology, validate_design
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import open from "open";
import { PreviewManager } from "./preview/preview-manager.mjs";
import {
  getById, getAll, search as searchStore,
  getArtifactGraph, getStats,
} from "./ontology/store.mjs";
import { validateDesign } from "./ontology/validation-engine.mjs";

const previewManager = new PreviewManager();

// Cleanup on exit
const cleanupPreview = async () => {
  try { await previewManager.cleanup(); } catch (_) {}
};
process.on("exit", cleanupPreview);
process.on("SIGINT", async () => { await cleanupPreview(); process.exit(0); });
process.on("SIGTERM", async () => { await cleanupPreview(); process.exit(0); });

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

function formatResult(title, data) {
  return `## ${title}\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
}

// ──────────────────────────────────────────
// MCP Server Setup
// ──────────────────────────────────────────

const server = new Server(
  {
    name: "ui-inspector",
    version: "1.1.0",
  },
  {
    capabilities: { tools: {} },
  }
);

// ──────────────────────────────────────────
// Tool Definitions
// ──────────────────────────────────────────

const TOOLS = [
  // ── Preview Tools (7) ──
  {
    name: "preview_start",
    description: "라이브 프리뷰 세션을 시작합니다. Vite 개발 서버를 실행하고 브라우저에서 미리보기를 엽니다.",
    inputSchema: {
      type: "object",
      properties: {
        project_name: { type: "string", description: "프로젝트 이름" },
        framework: { type: "string", enum: ["react", "vue", "vanilla"], description: "프레임워크 (기본: react)" },
        initial_code: { type: "object", description: "초기 파일 맵 { 'src/App.tsx': '코드...' }", additionalProperties: { type: "string" } },
        design_tokens: { type: "object", description: "디자인 토큰 객체", additionalProperties: { type: "string" } },
        port: { type: "number", description: "포트 (기본: 5173)" },
      },
      required: ["project_name"],
    },
  },
  {
    name: "preview_attach",
    description: "외부 개발 서버(Next.js, Vite 등)에 인스펙터를 연결합니다. 프록시를 통해 인스펙터가 주입된 URL을 브라우저에서 엽니다.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "대상 개발 서버 URL (예: http://localhost:3000)" },
        project_name: { type: "string", description: "프로젝트 이름 (선택)" },
        port: { type: "number", description: "프록시 포트 (기본: 자동 할당)" },
      },
      required: ["url"],
    },
  },
  {
    name: "preview_update",
    description: "프리뷰 파일을 업데이트합니다. Vite HMR이 변경을 즉시 반영합니다.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string" },
        files: { type: "object", additionalProperties: { type: "string" } },
        delete_files: { type: "array", items: { type: "string" } },
      },
      required: ["session_id", "files"],
    },
  },
  {
    name: "preview_status",
    description: "프리뷰 세션 상태를 확인합니다.",
    inputSchema: {
      type: "object",
      properties: { session_id: { type: "string" } },
      required: ["session_id"],
    },
  },
  {
    name: "preview_stop",
    description: "프리뷰 세션을 종료합니다.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string" },
        keep_files: { type: "boolean" },
      },
      required: ["session_id"],
    },
  },
  {
    name: "preview_export",
    description: "프리뷰 프로젝트를 프레임워크로 변환하여 ZIP으로 내보냅니다.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string" },
        target_framework: { type: "string", enum: ["nextjs", "vite-react", "vite-vue", "cra", "astro", "remix", "nuxt"] },
        output_path: { type: "string" },
        include_dependencies: { type: "boolean" },
      },
      required: ["session_id"],
    },
  },
  {
    name: "preview_screenshot",
    description: "프리뷰 스크린샷을 캡처합니다.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string" },
        viewport: { type: "string", enum: ["mobile", "tablet", "desktop", "full"] },
        selector: { type: "string" },
      },
      required: ["session_id"],
    },
  },

  // ── Inspector Tools (3) ──
  {
    name: "preview_select_element",
    description:
      "프리뷰의 요소 인스펙터 모드를 켜거나 끄고, 가장 최근에 클릭한 요소의 코드 위치(filePath, line)·" +
      "tag·className·textContent·boundingRect·computedStyles·parentChain·UI/UX 용어(uiTerm, uiDescription)를 반환합니다.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string" },
        action: {
          type: "string",
          enum: ["get_selected", "enable_inspector", "disable_inspector"],
          description: "동작 (기본: get_selected)",
        },
      },
      required: ["session_id"],
    },
  },
  {
    name: "inspector_get_selection",
    description:
      "인스펙터에서 가장 최근에 클릭한 요소의 상세 정보를 반환합니다. " +
      "사용자가 '이 부분', '여기', '선택한 요소', '클릭한 거', '이 컴포넌트' 등으로 지칭할 때 반드시 먼저 호출하세요. " +
      "session_id를 생략하면 모든 활성 세션 중 가장 최근 선택을 반환합니다. " +
      "응답에는 filePath/lineStart, codeName, tag, className, computedStyles, boundingRect, " +
      "parentChain, uiTerm(UI/UX 용어), uiDescription, selectedAt이 포함됩니다.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string", description: "세션 ID (생략 가능)" },
      },
      required: [],
    },
  },
  {
    name: "inspector_clear_selection",
    description: "현재 인스펙터 선택을 지웁니다. session_id를 생략하면 모든 세션의 선택을 지웁니다.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string" },
      },
      required: [],
    },
  },

  // ── Annotation Tools (4) ──
  {
    name: "annotation_list",
    description:
      "브라우저 프리뷰에서 사용자가 요소에 남긴 annotation(핀+코멘트) 목록을 반환합니다. " +
      "사용자가 '핀 단 것들', 'annotation 반영해줘', '메모한 것들 수정해줘', '표시한 부분들 처리해줘'라고 하면 " +
      "반드시 이 도구를 먼저 호출하세요. 각 annotation에는 번호, 코멘트, 요소 정보(이름·셀렉터·소스 위치·스타일·HTML 스니펫)가 포함됩니다. " +
      "수정을 완료한 항목은 annotation_resolve로 해결 처리하면 브라우저 핀이 초록색으로 바뀝니다.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string", description: "세션 ID (생략 시 모든 세션)" },
        status: { type: "string", enum: ["open", "resolved", "all"], description: "상태 필터 (기본: all)" },
      },
      required: [],
    },
  },
  {
    name: "annotation_resolve",
    description:
      "annotation을 해결(resolved) 처리합니다. 브라우저의 해당 핀이 초록색 체크로 바뀌어 사용자가 진행 상황을 실시간으로 봅니다. " +
      "코드 수정을 완료할 때마다 해당 annotation을 즉시 resolve하세요. note에 무엇을 어떻게 수정했는지 한 줄로 남기세요.",
    inputSchema: {
      type: "object",
      properties: {
        ids: { type: "array", items: { type: "string" }, description: "annotation ID 배열" },
        all: { type: "boolean", description: "true면 모든 annotation 대상" },
        note: { type: "string", description: "해결 메모 (핀 팝업에 표시됨)" },
        reopen: { type: "boolean", description: "true면 다시 open 상태로 되돌림" },
        session_id: { type: "string" },
      },
      required: [],
    },
  },
  {
    name: "annotation_remove",
    description: "annotation을 삭제합니다 (브라우저 핀도 사라짐). ids 배열 또는 all: true.",
    inputSchema: {
      type: "object",
      properties: {
        ids: { type: "array", items: { type: "string" } },
        all: { type: "boolean" },
        session_id: { type: "string" },
      },
      required: [],
    },
  },
  {
    name: "annotation_to_prompt",
    description:
      "모든 annotation을 AI 코딩 에이전트용 마크다운 태스크 리스트로 변환합니다 (Agentation 스타일). " +
      "다른 에이전트(Codex 등)에 전달하거나 작업 계획 문서로 쓸 때 사용하세요. " +
      "브라우저 툴바의 'Copy Prompt' 버튼도 동일한 포맷을 클립보드에 복사합니다.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string" },
        status: { type: "string", enum: ["open", "resolved", "all"], description: "기본: open" },
      },
      required: [],
    },
  },

  // ── Inspector Highlight (1) ──
  {
    name: "inspector_highlight",
    description:
      "브라우저 프리뷰에서 특정 요소를 잠시 하이라이트하고 스크롤하여 사용자에게 시각적으로 가리킵니다. " +
      "'여기를 수정했습니다', '이 요소를 말씀하시는 건가요?' 같은 커뮤니케이션에 사용하세요. " +
      "selector(CSS 셀렉터) 또는 data_at(파일:라인 형식의 data-at 값) 중 하나를 지정합니다.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS 셀렉터" },
        data_at: { type: "string", description: "data-at 값 (예: src/App.tsx:42)" },
        label: { type: "string", description: "하이라이트 옆에 표시할 라벨" },
        session_id: { type: "string" },
      },
      required: [],
    },
  },

  // ── Preview Errors (1) ──
  {
    name: "preview_errors",
    description:
      "프리뷰 페이지에서 캡처된 런타임 에러(uncaught error, unhandled rejection, console.error)를 반환합니다. " +
      "코드 수정 후 페이지가 정상 동작하는지 확인할 때 호출하세요.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string" },
        limit: { type: "number", description: "최대 개수 (기본: 20)" },
      },
      required: [],
    },
  },

  // ── Knowledge Tools (2) ──
  {
    name: "query_ontology",
    description:
      "온톨로지 저장소에서 키워드 검색/필터링으로 디자인 엔티티를 조회합니다. " +
      "DesignArtifact, VisualNode, StyleToken, LayoutConstraint, Interaction, RuleConstraint를 검색할 수 있습니다.",
    inputSchema: {
      type: "object",
      properties: {
        scope: { type: "string", enum: ["all", "artifact", "graph"] },
        q: { type: "string" },
        artifactId: { type: "string" },
        entityTypes: { type: "array", items: { type: "string" } },
        tags: { type: "array", items: { type: "string" } },
        limit: { type: "number" },
        minConfidence: { type: "number" },
      },
      required: [],
    },
  },
  {
    name: "validate_design",
    description:
      "디자인 후보 JSON을 규칙 기반으로 검증합니다. 대비 비율·터치 타겟·타이포 계층·간격 일관성 등을 검사합니다.",
    inputSchema: {
      type: "object",
      properties: {
        candidateJson: { type: "object", additionalProperties: true },
        ruleset: { type: "string", description: "all, contrast, tap_target, hierarchy, spacing — 쉼표 구분" },
        strictMode: { type: "boolean" },
      },
      required: ["candidateJson"],
    },
  },
];

// ──────────────────────────────────────────
// Request Handlers
// ──────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      // ── Preview ──
      case "preview_start": {
        const session = await previewManager.startSession(args);
        if (session.preview_url) { try { await open(session.preview_url); } catch (_) {} }
        return { content: [{ type: "text", text: formatResult("프리뷰 시작", session) }] };
      }
      case "preview_attach": {
        const session = await previewManager.attachSession(args);
        if (session.preview_url) { try { await open(session.preview_url); } catch (_) {} }
        return { content: [{ type: "text", text: formatResult("외부 서버 연결", session) }] };
      }
      case "preview_update": {
        const result = await previewManager.updateFiles(args.session_id, args.files, args.delete_files);
        return { content: [{ type: "text", text: formatResult("파일 업데이트", result) }] };
      }
      case "preview_status": {
        const status = previewManager.getStatus(args.session_id);
        return { content: [{ type: "text", text: formatResult("프리뷰 상태", status) }] };
      }
      case "preview_stop": {
        const result = await previewManager.stopSession(args.session_id, args.keep_files);
        return { content: [{ type: "text", text: formatResult("프리뷰 종료", result) }] };
      }
      case "preview_export": {
        const result = await previewManager.exportProject(args.session_id, args.target_framework, args.output_path);
        return { content: [{ type: "text", text: formatResult("프로젝트 내보내기", result) }] };
      }
      case "preview_screenshot": {
        const result = await previewManager.captureScreenshot(args.session_id, args.viewport, args.selector);
        return { content: [{ type: "text", text: formatResult("스크린샷", result) }] };
      }

      // ── Inspector ──
      case "preview_select_element": {
        const action = args.action || "get_selected";
        let result;
        if (action === "enable_inspector") {
          result = await previewManager.setInspectorMode(args.session_id, true);
        } else if (action === "disable_inspector") {
          result = await previewManager.setInspectorMode(args.session_id, false);
        } else {
          result = previewManager.getSelectedElement(args.session_id);
        }
        return { content: [{ type: "text", text: formatResult("엘리먼트 선택", result) }] };
      }
      case "inspector_get_selection": {
        const result = previewManager.getLastSelection(args.session_id);
        if (!result.selected_element) {
          return {
            content: [{
              type: "text",
              text: "현재 선택된 요소가 없습니다. 브라우저 인스펙터에서 요소를 먼저 클릭해주세요.",
            }],
          };
        }
        return { content: [{ type: "text", text: formatResult("최근 선택 요소", result) }] };
      }
      case "inspector_clear_selection": {
        const result = previewManager.clearSelection(args.session_id);
        return { content: [{ type: "text", text: formatResult("선택 해제", result) }] };
      }
      case "inspector_highlight": {
        if (!args.selector && !args.data_at) {
          return { content: [{ type: "text", text: "selector 또는 data_at 중 하나를 지정하세요." }], isError: true };
        }
        const result = previewManager.highlightElement(
          { selector: args.selector, dataAt: args.data_at, label: args.label },
          args.session_id
        );
        if (result.sessions.length === 0) {
          return { content: [{ type: "text", text: "활성 프리뷰 세션이 없습니다." }], isError: true };
        }
        return { content: [{ type: "text", text: formatResult("하이라이트 전송", result) }] };
      }

      // ── Annotations ──
      case "annotation_list": {
        const result = previewManager.listAnnotations(args.session_id, args.status || "all");
        if (result.total === 0) {
          return {
            content: [{
              type: "text",
              text: "annotation이 없습니다. 브라우저 툴바에서 'Annotate' 모드를 켜고 요소를 클릭해 코멘트를 남겨주세요.",
            }],
          };
        }
        return { content: [{ type: "text", text: formatResult(`Annotations (open ${result.open} / resolved ${result.resolved})`, result) }] };
      }
      case "annotation_resolve": {
        const ids = args.all ? "all" : (args.ids || []);
        if (ids !== "all" && ids.length === 0) {
          return { content: [{ type: "text", text: "ids 배열 또는 all: true를 지정하세요." }], isError: true };
        }
        const result = previewManager.resolveAnnotations(ids, {
          session_id: args.session_id,
          note: args.note,
          reopen: args.reopen,
        });
        return { content: [{ type: "text", text: formatResult(args.reopen ? "다시 열기" : "해결 처리", result) }] };
      }
      case "annotation_remove": {
        const ids = args.all ? "all" : (args.ids || []);
        if (ids !== "all" && ids.length === 0) {
          return { content: [{ type: "text", text: "ids 배열 또는 all: true를 지정하세요." }], isError: true };
        }
        const result = previewManager.removeAnnotations(ids, args.session_id);
        return { content: [{ type: "text", text: formatResult("삭제", result) }] };
      }
      case "annotation_to_prompt": {
        const result = previewManager.annotationsToPrompt(args.session_id, args.status || "open");
        if (result.count === 0) {
          return { content: [{ type: "text", text: "변환할 annotation이 없습니다." }] };
        }
        return { content: [{ type: "text", text: result.prompt }] };
      }

      // ── Preview Errors ──
      case "preview_errors": {
        const result = previewManager.getRuntimeErrors(args.session_id, args.limit ?? 20);
        if (result.errors.length === 0) {
          return { content: [{ type: "text", text: "캡처된 런타임 에러가 없습니다." }] };
        }
        return { content: [{ type: "text", text: formatResult("런타임 에러", result) }] };
      }

      // ── Knowledge ──
      case "query_ontology": {
        const scope = args.scope ?? "all";

        if (scope === "graph" && args.artifactId) {
          const graph = getArtifactGraph(args.artifactId);
          if (!graph) {
            return { content: [{ type: "text", text: `아티팩트를 찾을 수 없습니다: ${args.artifactId}` }], isError: true };
          }
          return { content: [{ type: "text", text: JSON.stringify(graph, null, 2) }] };
        }

        if (scope === "artifact" && args.artifactId) {
          const artifact = getById("DesignArtifact", args.artifactId);
          if (!artifact) {
            return { content: [{ type: "text", text: `아티팩트를 찾을 수 없습니다: ${args.artifactId}` }], isError: true };
          }
          return { content: [{ type: "text", text: JSON.stringify(artifact, null, 2) }] };
        }

        if (args.q) {
          const results = searchStore(args.q, {
            entityTypes: args.entityTypes,
            limit: args.limit ?? 50,
            minConfidence: args.minConfidence ?? 0,
          });
          let filtered = results;
          if (args.tags?.length) {
            const tagSet = new Set(args.tags.map((t) => t.toLowerCase()));
            filtered = results.filter((r) => {
              const e = r.entity;
              return tagSet.has(e.category?.toLowerCase?.()) ||
                     tagSet.has(e.role?.toLowerCase?.()) ||
                     tagSet.has(e.nodeType?.toLowerCase?.()) ||
                     tagSet.has(e.ruleType?.toLowerCase?.());
            });
          }
          return {
            content: [{ type: "text", text: JSON.stringify({ count: filtered.length, results: filtered }, null, 2) }],
          };
        }

        const stats = getStats();
        const artifacts = getAll("DesignArtifact");
        return { content: [{ type: "text", text: JSON.stringify({ stats, artifacts }, null, 2) }] };
      }

      case "validate_design": {
        const result = validateDesign(args.candidateJson, {
          ruleset: args.ruleset,
          strictMode: args.strictMode,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error in ${name}: ${err.message}\n\n${err.stack || ""}` }],
      isError: true,
    };
  }
});

// ──────────────────────────────────────────
// Start
// ──────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[ui-inspector] MCP server running on stdio");
