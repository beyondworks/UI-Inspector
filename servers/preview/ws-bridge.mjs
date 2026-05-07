import { WebSocketServer } from "ws";

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
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({ port: this.port, host: "localhost" });

      this.wss.on("listening", () => resolve());
      this.wss.on("error", (err) => reject(err));

      this.wss.on("connection", (ws) => {
        this.clients.add(ws);

        // Send current inspector state to newly connected client
        try {
          ws.send(
            JSON.stringify({ type: "inspector_state", data: { enabled: this.inspectorEnabled } })
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
