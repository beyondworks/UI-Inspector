/**
 * Design Normalizer
 *
 * Figma/Framer/Lovable/raw JSON 등 플랫폼별 rawPayload를
 * 공통 온톨로지 스키마(DesignArtifact + VisualNode + StyleToken 등)로 정규화.
 */

import {
  createDesignArtifact,
  createVisualNode,
  createStyleToken,
  createLayoutConstraint,
  createInteraction,
} from "./types.mjs";

// ──────────────────────────────────────────
// Platform Normalizers
// ──────────────────────────────────────────

/**
 * Normalize a raw design payload to ontology entities.
 * @param {object} params
 * @param {string} params.artifactId - Override artifact ID (for upsert)
 * @param {string} params.sourcePlatform - 'figma'|'framer'|'lovable'|'raw_json'
 * @param {object} params.rawPayload - Platform-specific data
 * @param {'auto'|'strict'|'lenient'} params.mappingMode
 * @returns {{ artifact: object, nodes: object[], tokens: object[], constraints: object[], interactions: object[] }}
 */
export function normalizeDesignPack({ artifactId, sourcePlatform, rawPayload, mappingMode = "auto" }) {
  if (!rawPayload || typeof rawPayload !== "object") {
    throw new Error("rawPayload must be a non-null object");
  }

  const platform = (sourcePlatform ?? "unknown").toLowerCase();

  switch (platform) {
    case "figma":
      return normalizeFigma(artifactId, rawPayload, mappingMode);
    case "framer":
      return normalizeFramer(artifactId, rawPayload, mappingMode);
    case "lovable":
      return normalizeLovable(artifactId, rawPayload, mappingMode);
    default:
      return normalizeGeneric(artifactId, platform, rawPayload, mappingMode);
  }
}

// ──────────────────────────────────────────
// Figma Normalizer
// ──────────────────────────────────────────

function normalizeFigma(artifactId, payload, mode) {
  const artifact = createDesignArtifact({
    id: artifactId,
    sourcePlatform: "figma",
    title: payload.name ?? payload.title ?? "Figma Design",
    type: guessFigmaArtifactType(payload),
    sourceRef: payload.fileKey ?? payload.id ?? "",
  });

  const nodes = [];
  const tokens = [];
  const constraints = [];
  const interactions = [];

  // Recursively walk Figma node tree
  if (payload.document?.children || payload.children || payload.nodes) {
    const children = payload.document?.children ?? payload.children ?? flattenFigmaNodes(payload.nodes);
    walkFigmaNode(children, artifact.id, null, nodes, tokens, constraints, mode);
  }

  // Extract styles/tokens from top-level styles
  if (payload.styles) {
    for (const [key, style] of Object.entries(payload.styles)) {
      tokens.push(createStyleToken({
        category: guessFigmaTokenCategory(style.styleType),
        name: style.name ?? key,
        value: style.description ?? key,
        source: "figma:style",
        confidence: 0.8,
      }));
    }
  }

  return { artifact, nodes, tokens, constraints, interactions };
}

function walkFigmaNode(children, artifactId, parentId, nodes, tokens, constraints, mode) {
  if (!Array.isArray(children)) return;

  for (const child of children) {
    const styleRefs = [];

    // Extract fills/strokes as inline tokens
    if (child.fills?.length) {
      for (const fill of child.fills) {
        if (fill.color) {
          const hex = rgbaToHex(fill.color);
          const token = createStyleToken({
            category: "color",
            name: `${child.name ?? "node"}_fill`,
            value: hex,
            source: `figma:node:${child.id ?? ""}`,
            confidence: 0.7,
          });
          tokens.push(token);
          styleRefs.push(token.id);
        }
      }
    }

    // Extract text style
    if (child.type === "TEXT" && child.style) {
      const s = child.style;
      const token = createStyleToken({
        category: "typography",
        name: `${child.name ?? "text"}_typography`,
        value: {
          fontFamily: s.fontFamily,
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          lineHeightPx: s.lineHeightPx,
          letterSpacing: s.letterSpacing,
        },
        source: `figma:text:${child.id ?? ""}`,
        confidence: 0.8,
      });
      tokens.push(token);
      styleRefs.push(token.id);
    }

    const node = createVisualNode({
      artifactId,
      nodeType: mapFigmaNodeType(child.type),
      role: guessNodeRole(child.name, child.type),
      parentId,
      contentText: child.characters ?? child.name ?? "",
      bbox: child.absoluteBoundingBox ?? child.size ? {
        x: child.absoluteBoundingBox?.x ?? 0,
        y: child.absoluteBoundingBox?.y ?? 0,
        width: child.absoluteBoundingBox?.width ?? child.size?.x ?? 0,
        height: child.absoluteBoundingBox?.height ?? child.size?.y ?? 0,
      } : null,
      styleRefs,
    });

    nodes.push(node);

    // Extract layout constraints
    if (child.constraints) {
      constraints.push(createLayoutConstraint({
        targetNodeId: node.id,
        ruleType: "figma_constraint",
        expression: JSON.stringify(child.constraints),
        severity: "info",
      }));
    }

    // Auto-layout constraints
    if (child.layoutMode) {
      constraints.push(createLayoutConstraint({
        targetNodeId: node.id,
        ruleType: "auto_layout",
        expression: JSON.stringify({
          mode: child.layoutMode,
          padding: child.paddingLeft ?? child.padding,
          gap: child.itemSpacing,
          align: child.primaryAxisAlignItems,
          counterAlign: child.counterAxisAlignItems,
        }),
        severity: "info",
      }));
    }

    // Recurse into children
    if (child.children) {
      walkFigmaNode(child.children, artifactId, node.id, nodes, tokens, constraints, mode);
    }
  }
}

function guessFigmaArtifactType(payload) {
  if (payload.document) return "page";
  if (payload.componentId || payload.type === "COMPONENT") return "component";
  return "screen";
}

function mapFigmaNodeType(figmaType) {
  const map = {
    FRAME: "frame",
    GROUP: "group",
    TEXT: "text",
    RECTANGLE: "frame",
    ELLIPSE: "vector",
    VECTOR: "vector",
    COMPONENT: "component",
    INSTANCE: "instance",
    SECTION: "section",
    BOOLEAN_OPERATION: "vector",
    LINE: "vector",
    STAR: "vector",
    POLYGON: "vector",
    SLICE: "frame",
  };
  return map[figmaType] ?? "frame";
}

function guessFigmaTokenCategory(styleType) {
  const map = { FILL: "color", TEXT: "typography", EFFECT: "shadow", GRID: "layout" };
  return map[styleType] ?? "color";
}

// ──────────────────────────────────────────
// Framer Normalizer
// ──────────────────────────────────────────

function normalizeFramer(artifactId, payload, mode) {
  const artifact = createDesignArtifact({
    id: artifactId,
    sourcePlatform: "framer",
    title: payload.name ?? payload.title ?? "Framer Design",
    type: "component",
    sourceRef: payload.id ?? "",
  });

  const nodes = [];
  const tokens = [];
  const constraints = [];
  const interactions = [];

  // Framer components
  if (payload.components || payload.children) {
    const items = payload.components ?? payload.children ?? [];
    for (const item of Array.isArray(items) ? items : Object.values(items)) {
      const node = createVisualNode({
        artifactId: artifact.id,
        nodeType: item.type === "text" ? "text" : "frame",
        role: guessNodeRole(item.name, item.type),
        contentText: item.text ?? item.name ?? "",
        bbox: item.rect ?? item.frame ?? null,
        styleRefs: [],
      });
      nodes.push(node);

      // Extract Framer style props
      if (item.style || item.css) {
        const style = item.style ?? item.css;
        for (const [prop, val] of Object.entries(style)) {
          const category = guessTokenCategoryFromProp(prop);
          if (category) {
            const token = createStyleToken({
              category,
              name: `${item.name ?? "framer"}_${prop}`,
              value: val,
              source: "framer:style",
              confidence: 0.7,
            });
            tokens.push(token);
            node.styleRefs.push(token.id);
          }
        }
      }

      // Framer interactions (variants, transitions)
      if (item.variants || item.onTap || item.whileHover) {
        interactions.push(createInteraction({
          sourceNodeId: node.id,
          trigger: item.onTap ? "click" : item.whileHover ? "hover" : "variant",
          targetNodeId: "",
          transition: item.transition?.type ?? "spring",
          params: item.transition ?? {},
        }));
      }
    }
  }

  return { artifact, nodes, tokens, constraints, interactions };
}

// ──────────────────────────────────────────
// Lovable Normalizer
// ──────────────────────────────────────────

function normalizeLovable(artifactId, payload, mode) {
  const artifact = createDesignArtifact({
    id: artifactId,
    sourcePlatform: "lovable",
    title: payload.name ?? payload.projectName ?? "Lovable Design",
    type: "screen",
    sourceRef: payload.projectId ?? payload.id ?? "",
  });

  const nodes = [];
  const tokens = [];
  const constraints = [];
  const interactions = [];

  // Lovable pages/components
  const pages = payload.pages ?? payload.screens ?? [payload];
  for (const page of Array.isArray(pages) ? pages : [pages]) {
    const elements = page.elements ?? page.components ?? page.children ?? [];
    for (const el of elements) {
      const node = createVisualNode({
        artifactId: artifact.id,
        nodeType: mapLovableNodeType(el.type),
        role: guessNodeRole(el.name ?? el.type, el.type),
        contentText: el.text ?? el.content ?? el.label ?? "",
        bbox: el.position ? {
          x: el.position.x ?? 0,
          y: el.position.y ?? 0,
          width: el.size?.width ?? el.width ?? 0,
          height: el.size?.height ?? el.height ?? 0,
        } : null,
        styleRefs: [],
      });
      nodes.push(node);

      // Tailwind classes → tokens
      if (el.className || el.tailwind) {
        const classes = (el.className ?? el.tailwind ?? "").split(/\s+/);
        for (const cls of classes) {
          const parsed = parseTailwindClass(cls);
          if (parsed) {
            const token = createStyleToken({
              category: parsed.category,
              name: cls,
              value: parsed.value,
              source: "lovable:tailwind",
              confidence: 0.6,
            });
            tokens.push(token);
            node.styleRefs.push(token.id);
          }
        }
      }
    }
  }

  return { artifact, nodes, tokens, constraints, interactions };
}

function mapLovableNodeType(type) {
  const map = { div: "frame", span: "text", p: "text", img: "image", button: "component", input: "component" };
  return map[type?.toLowerCase()] ?? "frame";
}

// ──────────────────────────────────────────
// Generic/Raw JSON Normalizer
// ──────────────────────────────────────────

function normalizeGeneric(artifactId, platform, payload, mode) {
  const artifact = createDesignArtifact({
    id: artifactId,
    sourcePlatform: platform || "raw_json",
    title: payload.name ?? payload.title ?? "Raw Design Data",
    type: payload.type ?? "component",
    sourceRef: payload.id ?? payload.sourceRef ?? "",
  });

  const nodes = [];
  const tokens = [];
  const constraints = [];
  const interactions = [];

  // Auto-detect common structures
  if (payload.nodes || payload.children || payload.elements || payload.components) {
    const items = payload.nodes ?? payload.children ?? payload.elements ?? payload.components;
    const list = Array.isArray(items) ? items : Object.values(items);

    for (const item of list) {
      nodes.push(createVisualNode({
        artifactId: artifact.id,
        nodeType: item.type ?? "frame",
        role: guessNodeRole(item.name, item.type),
        contentText: item.text ?? item.content ?? item.name ?? "",
        bbox: item.bbox ?? item.bounds ?? item.rect ?? null,
        styleRefs: [],
      }));
    }
  }

  // Auto-detect tokens
  if (payload.tokens || payload.styles || payload.designTokens) {
    const tokenData = payload.tokens ?? payload.styles ?? payload.designTokens;
    const entries = Array.isArray(tokenData) ? tokenData : Object.entries(tokenData).map(([k, v]) => ({ name: k, ...v }));

    for (const t of entries) {
      tokens.push(createStyleToken({
        category: t.category ?? guessTokenCategoryFromName(t.name ?? ""),
        name: t.name ?? "",
        value: t.value ?? t,
        source: `${platform}:token`,
        confidence: t.confidence ?? 0.5,
      }));
    }
  }

  return { artifact, nodes, tokens, constraints, interactions };
}

// ──────────────────────────────────────────
// Shared Helpers
// ──────────────────────────────────────────

function guessNodeRole(name, type) {
  if (!name) return "unknown";
  const lower = name.toLowerCase();
  if (/header|topbar|appbar/i.test(lower)) return "header";
  if (/footer|bottombar/i.test(lower)) return "footer";
  if (/sidebar|drawer/i.test(lower)) return "sidebar";
  if (/nav|menu|tabs/i.test(lower)) return "nav";
  if (/hero|banner/i.test(lower)) return "hero";
  if (/card|tile/i.test(lower)) return "card";
  if (/button|btn|cta/i.test(lower)) return "button";
  if (/input|field|textfield|textarea/i.test(lower)) return "input";
  if (/icon|svg/i.test(lower)) return "icon";
  if (/container|wrapper|layout|section/i.test(lower)) return "container";
  return "content";
}

function guessTokenCategoryFromProp(prop) {
  const lower = prop.toLowerCase();
  if (/color|background|fill|stroke|border-color/i.test(lower)) return "color";
  if (/font|text|line-height|letter-spacing/i.test(lower)) return "typography";
  if (/margin|padding|gap|space/i.test(lower)) return "spacing";
  if (/radius|rounded/i.test(lower)) return "radius";
  if (/shadow|elevation|box-shadow/i.test(lower)) return "shadow";
  if (/flex|grid|display|align|justify/i.test(lower)) return "layout";
  return null;
}

function guessTokenCategoryFromName(name) {
  return guessTokenCategoryFromProp(name) ?? "color";
}

function rgbaToHex(color) {
  if (!color) return "#000000";
  const r = Math.round((color.r ?? 0) * 255);
  const g = Math.round((color.g ?? 0) * 255);
  const b = Math.round((color.b ?? 0) * 255);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function flattenFigmaNodes(nodesObj) {
  if (!nodesObj || typeof nodesObj !== "object") return [];
  return Object.values(nodesObj).map((n) => n.document ?? n).filter(Boolean);
}

function parseTailwindClass(cls) {
  if (!cls) return null;
  if (/^(bg|text|border|ring|accent|fill|stroke)-/.test(cls)) return { category: "color", value: cls };
  if (/^(text-|font-|leading-|tracking-)/.test(cls)) return { category: "typography", value: cls };
  if (/^(p-|px-|py-|pt-|pb-|pl-|pr-|m-|mx-|my-|mt-|mb-|ml-|mr-|gap-|space-)/.test(cls)) return { category: "spacing", value: cls };
  if (/^rounded/.test(cls)) return { category: "radius", value: cls };
  if (/^shadow/.test(cls)) return { category: "shadow", value: cls };
  if (/^(flex|grid|block|inline|justify|items|self)/.test(cls)) return { category: "layout", value: cls };
  return null;
}
