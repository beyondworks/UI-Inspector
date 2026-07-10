import { WebSocketServer } from "ws";
import crypto from "node:crypto";

/**
 * @typedef {Object} Annotation
 * @property {string} id
 * @property {number} number        - display number (1-based, stable)
 * @property {string} comment
 * @property {"open" | "resolved"} status
 * @property {string | null} resolvedNote
 * @property {Object} element       - full element info captured at creation
 * @property {string} pageUrl
 * @property {string} createdAt
 * @property {string} updatedAt
 */

export class WSBridge {
  constructor(port = 5175) {
    this.port = port;
    this.wss = null;
    /** @type {Set<import("ws").WebSocket>} */
    this.clients = new Set();
    this.selectedElement = null;
    this.selectedAt = null;
    this.inspectorEnabled = false;
    this.lastError = null;
    /** @type {Array<Object>} */
    this.runtimeErrors = [];
    /** @type {((data: any) => Promise<any>) | null} */
    this.onExportRequest = null;
    /** @type {Map<string, Annotation>} */
    this.annotations = new Map();
    this.nextAnnotationNumber = 1;
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({ port: this.port, host: "localhost" });

      this.wss.on("listening", () => resolve());
      this.wss.on("error", (err) => reject(err));

      this.wss.on("connection", (ws) => {
        this.clients.add(ws);

        // Send current inspector state + annotations to newly connected client
        try {
          ws.send(
            JSON.stringify({ type: "inspector_state", data: { enabled: this.inspectorEnabled } })
          );
          ws.send(
            JSON.stringify({ type: "annotations_state", data: { annotations: this.getAnnotations() } })
          );
        } catch (_) {}

        ws.on("message", (raw) => {
          try {
            const msg = JSON.parse(raw.toString());
            this._handleMessage(msg);
          } catch (_) {}
        });

        ws.on("close", () => this.clients.delete(ws));
        ws.on("error", () => this.clients.delete(ws));
      });
    });
  }

  /**
   * @param {{ type: string, data?: any }} msg
   */
  _handleMessage(msg) {
    switch (msg.type) {
      case "element_selected":
        this.selectedElement = msg.data;
        this.selectedAt = new Date().toISOString();
        // Echo selection back to all clients (including CodePanel)
        this.broadcast({ type: "element_selected", data: msg.data });
        break;
      case "inspector_state":
        this.inspectorEnabled = !!msg.data?.enabled;
        // Echo back to all clients so InspectorOverlay picks it up
        this.broadcast({ type: "inspector_state", data: { enabled: this.inspectorEnabled } });
        break;
      case "runtime_error":
        this.lastError = msg.data;
        this.runtimeErrors.push({ ...msg.data, timestamp: Date.now() });
        if (this.runtimeErrors.length > 50) this.runtimeErrors.shift();
        break;
      case "request_export":
        if (this.onExportRequest) {
          this.broadcast({ type: "export_status", data: { status: "exporting" } });
          this.onExportRequest(msg.data || {})
            .then((result) => this.broadcast({ type: "export_complete", data: result }))
            .catch((err) => this.broadcast({ type: "export_error", data: { error: err.message } }));
        }
        break;
      case "element_hover":
        // Reserved for future use
        break;
      case "annotation_add": {
        const d = msg.data || {};
        if (!d.element) break;
        const id = d.id || "ann_" + crypto.randomBytes(5).toString("hex");
        const now = new Date().toISOString();
        this.annotations.set(id, {
          id,
          number: this.nextAnnotationNumber++,
          comment: String(d.comment || ""),
          status: "open",
          resolvedNote: null,
          element: d.element,
          // marquee multi-select: full element list (element is the representative)
          elements: Array.isArray(d.elements) && d.elements.length > 1 ? d.elements : null,
          pageUrl: String(d.pageUrl || ""),
          createdAt: now,
          updatedAt: now,
        });
        this._broadcastAnnotations();
        break;
      }
      case "annotation_update": {
        const d = msg.data || {};
        const ann = this.annotations.get(d.id);
        if (!ann) break;
        if (typeof d.comment === "string") ann.comment = d.comment;
        if (d.status === "open" || d.status === "resolved") ann.status = d.status;
        ann.updatedAt = new Date().toISOString();
        this._broadcastAnnotations();
        break;
      }
      case "annotation_remove": {
        const d = msg.data || {};
        if (this.annotations.delete(d.id)) this._broadcastAnnotations();
        break;
      }
      case "annotations_bulk_update": {
        const d = msg.data || {};
        const ids = Array.isArray(d.ids) ? d.ids : [];
        const status = d.status === "open" ? "open" : "resolved";
        const now = new Date().toISOString();
        let changed = 0;
        for (const id of ids) {
          const ann = this.annotations.get(id);
          if (!ann) continue;
          ann.status = status;
          if (status === "open") ann.resolvedNote = null;
          ann.updatedAt = now;
          changed++;
        }
        if (changed) this._broadcastAnnotations();
        break;
      }
      case "annotations_bulk_remove": {
        const d = msg.data || {};
        const ids = Array.isArray(d.ids) ? d.ids : [];
        let removed = 0;
        for (const id of ids) {
          if (this.annotations.delete(id)) removed++;
        }
        if (removed) this._broadcastAnnotations();
        break;
      }
      case "annotations_clear":
        this.annotations.clear();
        this._broadcastAnnotations();
        break;
      case "request_annotations":
        this._broadcastAnnotations();
        break;
      default:
        // Unknown message types are silently ignored
        break;
    }
  }

  /**
   * Enable or disable inspector mode and broadcast state to all clients.
   *
   * @param {boolean} enabled
   * @returns {{ inspector_enabled: boolean }}
   */
  setInspectorMode(enabled) {
    this.inspectorEnabled = enabled;
    this.broadcast({ type: "inspector_state", data: { enabled } });
    return { inspector_enabled: enabled };
  }

  /**
   * Return the most recently selected element, or null.
   *
   * @returns {Object | null}
   */
  getSelectedElement() {
    if (!this.selectedElement) return null;
    return { ...this.selectedElement, selectedAt: this.selectedAt };
  }

  /**
   * Clear the most recent selection.
   */
  clearSelection() {
    this.selectedElement = null;
    this.selectedAt = null;
  }

  /**
   * Notify all connected clients that files have been updated.
   *
   * @param {Object<string, string>} files - relPath -> content map
   */
  notifyUpdate(files) {
    this.broadcast({ type: "files_updated", files: Object.keys(files) });
  }

  /* ── Annotations (server-side API for MCP tools) ───────────── */

  /**
   * Return all annotations sorted by display number.
   *
   * @param {"open" | "resolved" | "all"} [status="all"]
   * @returns {Annotation[]}
   */
  getAnnotations(status = "all") {
    const list = Array.from(this.annotations.values());
    const filtered = status === "all" ? list : list.filter((a) => a.status === status);
    return filtered.sort((a, b) => a.number - b.number);
  }

  /**
   * Mark annotations as resolved (or reopen). Pins update live in the browser.
   *
   * @param {string[] | "all"} ids
   * @param {Object} [opts]
   * @param {string} [opts.note]        - resolution note shown in the pin popup
   * @param {boolean} [opts.reopen]     - set status back to "open"
   * @returns {{ updated: string[], notFound: string[] }}
   */
  resolveAnnotations(ids, { note, reopen = false } = {}) {
    const targetIds = ids === "all"
      ? Array.from(this.annotations.keys())
      : Array.isArray(ids) ? ids : [];
    const updated = [];
    const notFound = [];
    for (const id of targetIds) {
      const ann = this.annotations.get(id);
      if (!ann) { notFound.push(id); continue; }
      ann.status = reopen ? "open" : "resolved";
      ann.resolvedNote = reopen ? null : (note ?? ann.resolvedNote);
      ann.updatedAt = new Date().toISOString();
      updated.push(id);
    }
    if (updated.length) this._broadcastAnnotations();
    return { updated, notFound };
  }

  /**
   * Remove annotations by id, or all of them.
   *
   * @param {string[] | "all"} ids
   * @returns {{ removed: string[] }}
   */
  removeAnnotations(ids) {
    const targetIds = ids === "all"
      ? Array.from(this.annotations.keys())
      : Array.isArray(ids) ? ids : [];
    const removed = [];
    for (const id of targetIds) {
      if (this.annotations.delete(id)) removed.push(id);
    }
    if (removed.length) this._broadcastAnnotations();
    return { removed };
  }

  /**
   * Flash-highlight an element in the browser (agent → user visual pointing).
   *
   * @param {{ selector?: string, dataAt?: string, label?: string }} target
   */
  highlightElement(target = {}) {
    this.broadcast({ type: "highlight_element", data: target });
  }

  /**
   * Return recent runtime errors captured from the page.
   *
   * @param {number} [limit=20]
   * @returns {Array<Object>}
   */
  getRuntimeErrors(limit = 20) {
    return this.runtimeErrors.slice(-limit);
  }

  _broadcastAnnotations() {
    this.broadcast({ type: "annotations_state", data: { annotations: this.getAnnotations() } });
  }

  /**
   * Send a message to all currently open clients.
   *
   * @param {Object} msg
   */
  broadcast(msg) {
    const data = JSON.stringify(msg);
    for (const client of this.clients) {
      if (client.readyState === 1 /* OPEN */) {
        try {
          client.send(data);
        } catch (_) {}
      }
    }
  }

  /**
   * Close all connections and shut down the WebSocket server.
   *
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.wss) return;

    for (const client of this.clients) {
      try { client.close(); } catch (_) {}
    }
    this.clients.clear();

    return new Promise((resolve) => {
      this.wss.close(() => {
        this.wss = null;
        resolve();
      });
    });
  }
}
