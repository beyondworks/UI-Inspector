import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { ProjectScaffold } from "./project-scaffold.mjs";
import { ViteLauncher } from "./vite-launcher.mjs";
import { WSBridge } from "./ws-bridge.mjs";
import { ExportEngine } from "./export-engine.mjs";
import { NextjsConverter } from "./converters/nextjs.mjs";
import { ViteReactConverter } from "./converters/vite-react.mjs";
import { ViteVueConverter } from "./converters/vite-vue.mjs";
import { NuxtConverter } from "./converters/nuxt.mjs";
import { AstroConverter } from "./converters/astro.mjs";
import { RemixConverter } from "./converters/remix.mjs";
import { InjectProxy } from "./inject-proxy.mjs";
import { generateInspectorScript } from "./inspector-inject.mjs";

/**
 * @typedef {Object} PreviewSession
 * @property {string} id
 * @property {string} projectName
 * @property {string} framework
 * @property {string} projectDir
 * @property {import("node:child_process").ChildProcess | null} viteProcess
 * @property {number | null} vitePort
 * @property {string | null} previewUrl
 * @property {WSBridge | null} wsBridge
 * @property {number | null} wsPort
 * @property {string | null} wsUrl
 * @property {Object} fileTree
 * @property {string | null} lastError
 * @property {Date} createdAt
 * @property {"starting" | "running" | "error" | "stopped"} status
 * @property {"standalone" | "attached"} mode
 * @property {string | null} targetUrl
 * @property {InjectProxy | null} injectProxy
 */

export class PreviewManager {
  constructor() {
    /** @type {Map<string, PreviewSession>} */
    this.sessions = new Map();
    this.scaffold = new ProjectScaffold();
    this.viteLauncher = new ViteLauncher();
    this.exportEngine = new ExportEngine();
    this.exportEngine.registerConverter("nextjs", new NextjsConverter());
    this.exportEngine.registerConverter("vite-react", new ViteReactConverter());
    this.exportEngine.registerConverter("vite-vue", new ViteVueConverter());
    this.exportEngine.registerConverter("nuxt", new NuxtConverter());
    this.exportEngine.registerConverter("astro", new AstroConverter());
    this.exportEngine.registerConverter("remix", new RemixConverter());

    // Ensure cleanup on process exit
    process.on("exit", () => this._syncCleanup());
    process.on("SIGINT", () => { this.cleanup().finally(() => process.exit(0)); });
    process.on("SIGTERM", () => { this.cleanup().finally(() => process.exit(0)); });
  }

  /**
   * Start a new preview session: scaffold project, install deps, launch Vite.
   *
   * @param {Object} opts
   * @param {string} opts.project_name
   * @param {string} [opts.framework="react"]
   * @param {Object} [opts.initial_code={}]
   * @param {Object | null} [opts.design_tokens=null]
   * @param {number} [opts.port=5173]
   * @returns {Promise<{ session_id, preview_url, ws_port, ws_url, project_dir, files, status }>}
   */
  async startSession({ project_name, framework = "react", initial_code = {}, design_tokens = null, port = 5173 } = {}) {
    if (!project_name) throw new Error("project_name is required");

    const sessionId = "prev_" + crypto.randomBytes(6).toString("hex");

    /** @type {PreviewSession} */
    const session = {
      id: sessionId,
      projectName: project_name,
      framework,
      projectDir: null,
      viteProcess: null,
      vitePort: null,
      previewUrl: null,
      wsBridge: null,
      wsPort: null,
      wsUrl: null,
      fileTree: {},
      lastError: null,
      createdAt: new Date(),
      status: "starting",
    };
    this.sessions.set(sessionId, session);

    try {
      // 1. Scaffold project
      const { projectDir, fileTree } = await this.scaffold.create(
        project_name,
        framework,
        initial_code,
        design_tokens
      );
      session.projectDir = projectDir;
      session.fileTree = fileTree;

      // 2. Start Vite
      const { process: viteProcess, url, port: assignedPort } = await this.viteLauncher.start(projectDir, port);
      session.viteProcess = viteProcess;
      session.vitePort = assignedPort;
      session.previewUrl = url;
      session.status = "running";

      // Track unexpected exits
      viteProcess.on("exit", (code, signal) => {
        if (session.status === "running") {
          session.status = "error";
          session.lastError = `Vite exited unexpectedly (code=${code}, signal=${signal})`;
        }
      });

      // 3. Start WSBridge (WS port = vite port + 2); failure is non-fatal
      const wsPort = assignedPort + 2;
      try {
        const wsBridge = new WSBridge(wsPort);
        await wsBridge.start();
        session.wsBridge = wsBridge;
        session.wsPort = wsPort;
        session.wsUrl = `ws://localhost:${wsPort}`;

        // Hook up export request from browser UI
        wsBridge.onExportRequest = async (data) => {
          const framework = data?.framework || "vite-react";
          const outputPath = data?.output_path || null;
          return this.exportProject(sessionId, framework, outputPath);
        };
      } catch (wsErr) {
        console.error(`[WSBridge] Failed to start on port ${wsPort}:`, wsErr.message);
      }

      // 4. Patch ws-port meta tag in scaffolded index.html to match actual wsPort
      const indexHtmlPath = path.resolve(session.projectDir, "index.html");
      if (fs.existsSync(indexHtmlPath)) {
        try {
          const html = fs.readFileSync(indexHtmlPath, "utf8");
          const patched = html.replace(
            /<meta\s+name="ws-port"\s+content="[^"]*"\s*\/>/,
            `<meta name="ws-port" content="${wsPort}" />`
          );
          fs.writeFileSync(indexHtmlPath, patched, "utf8");
        } catch (patchErr) {
          console.error(`[PreviewManager] Failed to patch ws-port in index.html:`, patchErr.message);
        }
      }

      return {
        session_id: sessionId,
        preview_url: url,
        ws_port: session.wsPort,
        ws_url: session.wsUrl,
        project_dir: projectDir,
        files: fileTree,
        status: session.status,
      };
    } catch (err) {
      session.status = "error";
      session.lastError = err.message;
      throw err;
    }
  }

  /**
   * Attach to an existing external dev server (e.g., Next.js on localhost:3000).
   * Creates an HTTP proxy that injects the inspector script into HTML responses.
   *
   * @param {Object} opts
   * @param {string} opts.url - Target dev server URL
   * @param {string} [opts.project_name] - Optional project name
   * @param {number} [opts.port=5180] - Preferred proxy port
   * @returns {Promise<Object>}
   */
  async attachSession({ url, project_name, port = 5180 } = {}) {
    if (!url) throw new Error("url is required");

    // Validate target URL is reachable
    await this._checkTargetReachable(url);

    const sessionId = "att_" + crypto.randomBytes(6).toString("hex");
    let parsedUrl;
    try { parsedUrl = new URL(url); } catch { throw new Error(`Invalid URL: ${url}`); }

    const session = {
      id: sessionId,
      projectName: project_name || parsedUrl.hostname + (parsedUrl.port ? ":" + parsedUrl.port : ""),
      framework: "external",
      projectDir: null,
      viteProcess: null,
      vitePort: null,
      previewUrl: null,
      wsBridge: null,
      wsPort: null,
      wsUrl: null,
      fileTree: {},
      lastError: null,
      createdAt: new Date(),
      status: "starting",
      mode: "attached",
      targetUrl: url,
      injectProxy: null,
    };
    this.sessions.set(sessionId, session);

    try {
      // 1. Find available port for proxy
      const proxyPort = await this.viteLauncher.findAvailablePort(port);
      const wsPort = proxyPort + 2;

      // 2. Start WSBridge
      const wsBridge = new WSBridge(wsPort);
      await wsBridge.start();
      session.wsBridge = wsBridge;
      session.wsPort = wsPort;
      session.wsUrl = `ws://localhost:${wsPort}`;

      // 3. Create and start InjectProxy
      const proxy = new InjectProxy(url, () => generateInspectorScript(wsPort));
      const { proxyUrl } = await proxy.start(proxyPort);
      session.injectProxy = proxy;
      session.previewUrl = proxyUrl;
      session.status = "running";

      return {
        session_id: sessionId,
        preview_url: proxyUrl,
        target_url: url,
        ws_port: wsPort,
        ws_url: session.wsUrl,
        mode: "attached",
        status: session.status,
      };
    } catch (err) {
      session.status = "error";
      session.lastError = err.message;
      // Clean up partial resources
      if (session.wsBridge) { await session.wsBridge.stop().catch(() => {}); }
      if (session.injectProxy) { await session.injectProxy.stop().catch(() => {}); }
      this.sessions.delete(sessionId);
      throw err;
    }
  }

  /**
   * Check if a target URL is reachable.
   * @param {string} url
   * @returns {Promise<void>}
   */
  async _checkTargetReachable(url) {
    const { default: http } = await import("node:http");
    const { default: https } = await import("node:https");
    const parsed = new URL(url);
    const requester = parsed.protocol === "https:" ? https : http;

    return new Promise((resolve, reject) => {
      const req = requester.get(url, { timeout: 5000 }, (res) => {
        res.resume(); // drain response
        resolve();
      });
      req.on("error", (err) => {
        reject(new Error(`Target server unreachable (${url}): ${err.message}`));
      });
      req.on("timeout", () => {
        req.destroy();
        reject(new Error(`Target server timeout (${url}): 5000ms exceeded`));
      });
    });
  }

  /**
   * Write or delete files in a running session. Vite HMR picks up changes automatically.
   *
   * @param {string} sessionId
   * @param {Object<string, string>} files  - relPath -> content map for writes
   * @param {string[]} [deleteFiles=[]]     - relative paths to remove
   * @returns {Promise<{ updated, deleted, hmr_status, file_tree }>}
   */
  async updateFiles(sessionId, files = {}, deleteFiles = []) {
    const session = this._requireSession(sessionId);
    if (session.mode === "attached") {
      throw new Error("Cannot update files for attached sessions. Files are managed by the external dev server.");
    }

    const updated = [];
    const deleted = [];
    const errors = [];

    // Write files
    for (const [relPath, content] of Object.entries(files)) {
      try {
        const absPath = path.resolve(session.projectDir, relPath);
        if (!absPath.startsWith(path.resolve(session.projectDir))) {
          throw new Error(`Path traversal blocked: ${relPath}`);
        }
        fs.mkdirSync(path.dirname(absPath), { recursive: true });
        fs.writeFileSync(absPath, content, "utf8");
        updated.push(relPath);
      } catch (err) {
        errors.push({ path: relPath, error: err.message });
      }
    }

    // Delete files
    for (const relPath of deleteFiles) {
      try {
        const absPath = path.resolve(session.projectDir, relPath);
        if (!absPath.startsWith(path.resolve(session.projectDir))) {
          throw new Error(`Path traversal blocked: ${relPath}`);
        }
        if (fs.existsSync(absPath)) {
          fs.rmSync(absPath, { force: true });
          deleted.push(relPath);
        }
      } catch (err) {
        errors.push({ path: relPath, error: err.message });
      }
    }

    // Rebuild file tree
    session.fileTree = await this.scaffold.buildFileTree(session.projectDir);

    // Notify browser clients of updated files via WSBridge
    if (session.wsBridge && Object.keys(files).length > 0) {
      session.wsBridge.notifyUpdate(files);
    }

    const hmr_status = session.status === "running"
      ? errors.length === 0 ? "active" : "partial"
      : "unavailable";

    return {
      updated,
      deleted,
      hmr_status,
      file_tree: session.fileTree,
      ...(errors.length > 0 && { errors }),
    };
  }

  /**
   * Return the current status of a session.
   *
   * @param {string} sessionId
   * @returns {Object}
   */
  getStatus(sessionId) {
    const session = this._requireSession(sessionId);
    const uptimeMs = Date.now() - session.createdAt.getTime();

    return {
      session_id: session.id,
      status: session.status,
      preview_url: session.previewUrl,
      project_dir: session.projectDir,
      framework: session.framework,
      file_tree: session.fileTree,
      last_error: session.lastError,
      uptime_ms: uptimeMs,
      created_at: session.createdAt.toISOString(),
      mode: session.mode || "standalone",
      target_url: session.targetUrl || null,
    };
  }

  /**
   * Stop a session and optionally remove its files from disk.
   *
   * @param {string} sessionId
   * @param {boolean} [keepFiles=false]
   * @returns {Promise<Object>}
   */
  async stopSession(sessionId, keepFiles = false) {
    const session = this._requireSession(sessionId);

    // 1. Stop WSBridge
    if (session.wsBridge) {
      await session.wsBridge.stop().catch(() => {});
      session.wsBridge = null;
    }

    // 2. Stop InjectProxy (attached mode)
    if (session.injectProxy) {
      await session.injectProxy.stop().catch(() => {});
      session.injectProxy = null;
    }

    // 3. Stop Vite (standalone mode)
    if (session.viteProcess) {
      await this.viteLauncher.stop(session.viteProcess);
      session.viteProcess = null;
    }
    session.status = "stopped";

    // 4. Optionally clean up files (standalone mode only)
    if (!keepFiles && session.projectDir) {
      await this.scaffold.cleanup(session.projectDir);
    }

    // 4. Remove from sessions map
    this.sessions.delete(sessionId);

    return {
      session_id: sessionId,
      status: "stopped",
      files_removed: !keepFiles,
    };
  }

  /**
   * Stop all active sessions. Called on process exit.
   *
   * @returns {Promise<void>}
   */
  async cleanup() {
    const stops = Array.from(this.sessions.keys()).map((id) =>
      this.stopSession(id, false).catch(() => {})
    );
    await Promise.all(stops);
  }

  /**
   * Enable or disable element inspector mode via WSBridge.
   *
   * @param {string} sessionId
   * @param {boolean} enabled
   * @returns {Promise<Object>}
   */
  async setInspectorMode(sessionId, enabled) {
    const session = this._requireSession(sessionId);
    if (!session.wsBridge) {
      return {
        inspector_mode: enabled,
        note: "WSBridge not available for this session.",
      };
    }
    const result = session.wsBridge.setInspectorMode(enabled);
    return {
      inspector_mode: result.inspector_enabled,
    };
  }

  /**
   * Get the currently selected element from the inspector via WSBridge.
   *
   * @param {string} sessionId
   * @returns {Object}
   */
  getSelectedElement(sessionId) {
    const session = this._requireSession(sessionId);
    if (!session.wsBridge) {
      return { selected_element: null };
    }
    return {
      selected_element: session.wsBridge.getSelectedElement(),
    };
  }

  /**
   * Get the most recent selection across all active sessions, or for a
   * specific session if sessionId is provided. Returns the freshest
   * (most recently selected) entry.
   *
   * @param {string} [sessionId]
   * @returns {{ session_id: string | null, selected_element: Object | null }}
   */
  getLastSelection(sessionId) {
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (!session || !session.wsBridge) return { session_id: sessionId, selected_element: null };
      return { session_id: sessionId, selected_element: session.wsBridge.getSelectedElement() };
    }
    let bestSid = null;
    let bestEl = null;
    let bestTs = 0;
    for (const [sid, sess] of this.sessions) {
      if (!sess.wsBridge) continue;
      const el = sess.wsBridge.getSelectedElement();
      if (!el) continue;
      const ts = Date.parse(el.selectedAt || "") || 0;
      if (ts >= bestTs) {
        bestTs = ts;
        bestEl = el;
        bestSid = sid;
      }
    }
    return { session_id: bestSid, selected_element: bestEl };
  }

  /**
   * Clear the selection for a session, or all sessions if omitted.
   *
   * @param {string} [sessionId]
   * @returns {{ cleared: string[] }}
   */
  clearSelection(sessionId) {
    const cleared = [];
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (session && session.wsBridge) {
        session.wsBridge.clearSelection();
        cleared.push(sessionId);
      }
    } else {
      for (const [sid, sess] of this.sessions) {
        if (sess.wsBridge) {
          sess.wsBridge.clearSelection();
          cleared.push(sid);
        }
      }
    }
    return { cleared };
  }

  /* ── Annotations ─────────────────────────────────────────────── */

  /**
   * Collect wsBridge-backed sessions, optionally narrowed to one id.
   *
   * @param {string} [sessionId]
   * @returns {Array<[string, PreviewSession]>}
   */
  _bridgeSessions(sessionId) {
    if (sessionId) {
      const session = this._requireSession(sessionId);
      return session.wsBridge ? [[sessionId, session]] : [];
    }
    return Array.from(this.sessions.entries()).filter(([, s]) => s.wsBridge);
  }

  /**
   * List annotations across all sessions (or one session).
   *
   * @param {string} [sessionId]
   * @param {"open" | "resolved" | "all"} [status="all"]
   * @returns {{ total: number, open: number, resolved: number, annotations: Array<Object> }}
   */
  listAnnotations(sessionId, status = "all") {
    const annotations = [];
    for (const [sid, session] of this._bridgeSessions(sessionId)) {
      for (const ann of session.wsBridge.getAnnotations(status)) {
        annotations.push({ session_id: sid, ...ann });
      }
    }
    const open = annotations.filter((a) => a.status === "open").length;
    return {
      total: annotations.length,
      open,
      resolved: annotations.length - open,
      annotations,
    };
  }

  /**
   * Resolve (or reopen) annotations. `ids: "all"` targets every annotation.
   *
   * @param {string[] | "all"} ids
   * @param {{ session_id?: string, note?: string, reopen?: boolean }} [opts]
   * @returns {{ updated: string[], notFound: string[] }}
   */
  resolveAnnotations(ids, { session_id, note, reopen } = {}) {
    const updated = [];
    let notFound = Array.isArray(ids) ? [...ids] : [];
    for (const [, session] of this._bridgeSessions(session_id)) {
      const remaining = ids === "all" ? "all" : notFound;
      const res = session.wsBridge.resolveAnnotations(remaining, { note, reopen });
      updated.push(...res.updated);
      if (ids !== "all") notFound = res.notFound;
    }
    return { updated, notFound: ids === "all" ? [] : notFound };
  }

  /**
   * Remove annotations. `ids: "all"` clears everything.
   *
   * @param {string[] | "all"} ids
   * @param {string} [sessionId]
   * @returns {{ removed: string[] }}
   */
  removeAnnotations(ids, sessionId) {
    const removed = [];
    let remaining = Array.isArray(ids) ? [...ids] : ids;
    for (const [, session] of this._bridgeSessions(sessionId)) {
      const res = session.wsBridge.removeAnnotations(remaining);
      removed.push(...res.removed);
      if (Array.isArray(remaining)) {
        remaining = remaining.filter((id) => !res.removed.includes(id));
      }
    }
    return { removed };
  }

  /**
   * Build an agent-ready markdown prompt from annotations (Agentation-style).
   * The same format is produced by the in-browser "Copy Prompt" button, so
   * output can be pasted into any coding agent (Claude Code, Codex, ...).
   *
   * @param {string} [sessionId]
   * @param {"open" | "resolved" | "all"} [status="open"]
   * @returns {{ count: number, prompt: string }}
   */
  annotationsToPrompt(sessionId, status = "open") {
    const { annotations } = this.listAnnotations(sessionId, status);
    if (annotations.length === 0) {
      return { count: 0, prompt: "" };
    }
    const lines = [
      `# UI Annotations (${annotations.length})`,
      "",
      "다음은 라이브 프리뷰에서 사용자가 요소에 남긴 수정 요청입니다.",
      "각 항목의 요소를 찾아 요청을 반영하세요.",
      "",
    ];
    for (const ann of annotations) {
      const el = ann.element || {};
      const name = el.elementName || {};
      lines.push(`## ${ann.number}. ${ann.comment || "(코멘트 없음)"}`);
      if (ann.status === "resolved") lines.push(`- Status: resolved${ann.resolvedNote ? ` — ${ann.resolvedNote}` : ""}`);
      if (name.primary) lines.push(`- Element: ${name.primary} (${el.uiTerm || el.tag || "?"})`);
      if (el.cssPath || name.selector) lines.push(`- Selector: \`${el.cssPath || name.selector}\``);
      if (el.sourceLocation) lines.push(`- Source: ${el.sourceLocation.file}:${el.sourceLocation.line}`);
      if (ann.pageUrl) lines.push(`- Page: ${ann.pageUrl}`);
      if (el.textContent?.trim()) lines.push(`- Text: "${el.textContent.trim().slice(0, 80)}"`);
      if (el.boundingRect) lines.push(`- Size: ${Math.round(el.boundingRect.width)}×${Math.round(el.boundingRect.height)}px`);
      if (el.htmlSnippet) {
        lines.push("- HTML:", "```html", el.htmlSnippet, "```");
      }
      lines.push("");
    }
    return { count: annotations.length, prompt: lines.join("\n") };
  }

  /**
   * Flash-highlight an element in connected browsers (agent → user pointing).
   *
   * @param {{ selector?: string, dataAt?: string, label?: string }} target
   * @param {string} [sessionId]
   * @returns {{ sessions: string[] }}
   */
  highlightElement(target, sessionId) {
    const sessions = [];
    for (const [sid, session] of this._bridgeSessions(sessionId)) {
      session.wsBridge.highlightElement(target);
      sessions.push(sid);
    }
    return { sessions };
  }

  /**
   * Return recent runtime/console errors captured from the page.
   *
   * @param {string} [sessionId]
   * @param {number} [limit=20]
   * @returns {{ errors: Array<Object> }}
   */
  getRuntimeErrors(sessionId, limit = 20) {
    const errors = [];
    for (const [sid, session] of this._bridgeSessions(sessionId)) {
      for (const err of session.wsBridge.getRuntimeErrors(limit)) {
        errors.push({ session_id: sid, ...err });
      }
    }
    errors.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    return { errors: errors.slice(-limit) };
  }

  /**
   * Export the project directory as a ZIP archive.
   *
   * @param {string} sessionId
   * @param {string} [targetFramework="vite-react"]
   * @param {string} [outputPath]
   * @returns {Promise<Object>}
   */
  async exportProject(sessionId, targetFramework = "vite-react", outputPath = null) {
    const session = this._requireSession(sessionId);
    if (session.mode === "attached") {
      throw new Error("Export is not available for attached sessions.");
    }
    const exportFileName = `gemini-export-${session.projectName}-${targetFramework}.zip`;

    if (outputPath) {
      // User-specified path: expand ~ and handle directory vs file
      if (outputPath.startsWith("~")) {
        outputPath = path.join(os.homedir(), outputPath.slice(1));
      }
      outputPath = path.resolve(outputPath);
      // If path doesn't end with .zip, treat as directory
      if (!outputPath.endsWith(".zip")) {
        outputPath = path.join(outputPath, exportFileName);
      }
    } else {
      // Default: ~/Downloads
      outputPath = path.join(os.homedir(), "Downloads", exportFileName);
    }

    const result = await this.exportEngine.export(session.projectDir, targetFramework, outputPath);
    return result;
  }

  /**
   * Capture a screenshot of the preview via a headless browser.
   * Phase 1 stub.
   *
   * @param {string} sessionId
   * @param {string} [viewport="desktop"]
   * @param {string} [selector]
   * @returns {Promise<Object>}
   */
  async captureScreenshot(sessionId, viewport = "desktop", selector) {
    this._requireSession(sessionId);
    return {
      viewport,
      selector: selector || null,
      screenshot_data: null,
      note: "Screenshot capture is not yet implemented (Phase 2). Use the browser directly at the preview_url.",
    };
  }

  /**
   * Synchronous best-effort cleanup for process "exit" event (no async allowed).
   */
  _syncCleanup() {
    for (const session of this.sessions.values()) {
      if (session.viteProcess) {
        try { session.viteProcess.kill("SIGKILL"); } catch { /* ignore */ }
      }
      if (session.wsBridge && session.wsBridge.wss) {
        try {
          for (const client of session.wsBridge.clients) {
            client.terminate();
          }
          session.wsBridge.wss.close();
        } catch { /* ignore */ }
      }
      if (session.injectProxy && session.injectProxy.server) {
        try { session.injectProxy.server.close(); } catch { /* ignore */ }
      }
    }
  }

  /**
   * Get session or throw a descriptive error.
   *
   * @param {string} sessionId
   * @returns {PreviewSession}
   */
  _requireSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    return session;
  }
}
