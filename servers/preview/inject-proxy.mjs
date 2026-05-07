import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import zlib from "node:zlib";
import net from "node:net";

const MAX_PORT_SEARCH = 20;

/**
 * HTTP/WS proxy that injects an inspector script into HTML responses.
 * Transparently proxies all other requests and WebSocket upgrades (HMR).
 */
export class InjectProxy {
  /**
   * @param {string} targetUrl - The URL of the dev server to proxy (e.g., "http://localhost:3000")
   * @param {() => string} getInspectorScript - Function returning the JS script string to inject
   */
  constructor(targetUrl, getInspectorScript) {
    this.target = new URL(targetUrl);
    this.getInspectorScript = getInspectorScript;
    this.server = null;
    this.port = null;
    this._isHttps = this.target.protocol === "https:";
    this._requester = this._isHttps ? https : http;
  }

  /**
   * Start the proxy server.
   * @param {number} [port=5180] - Preferred port
   * @returns {Promise<{ proxyUrl: string, port: number }>}
   */
  async start(port = 5180) {
    const availablePort = await this._findAvailablePort(port);
    this.port = availablePort;

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this._handleRequest(req, res));
      this.server.on("upgrade", (req, socket, head) => this._handleUpgrade(req, socket, head));
      this.server.on("error", reject);
      this.server.listen(availablePort, "localhost", () => {
        this.server.removeListener("error", reject);
        const proxyUrl = `http://localhost:${availablePort}`;
        resolve({ proxyUrl, port: availablePort });
      });
    });
  }

  /**
   * Stop the proxy server and close all connections.
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.server) return;
    return new Promise((resolve) => {
      this.server.close(() => {
        this.server = null;
        resolve();
      });
      // Force-close idle connections
      this.server.closeAllConnections?.();
    });
  }

  /**
   * Handle an incoming HTTP request by proxying to the target.
   * Injects inspector script into HTML responses.
   */
  _handleRequest(clientReq, clientRes) {
    const targetPort = this.target.port || (this._isHttps ? 443 : 80);
    const options = {
      hostname: this.target.hostname,
      port: targetPort,
      path: clientReq.url,
      method: clientReq.method,
      headers: { ...clientReq.headers },
    };

    // Rewrite Host header to target
    options.headers.host = this.target.host;
    // Remove accept-encoding to get uncompressed responses for injection
    // (simpler than decompressing/recompressing; negligible overhead for localhost)
    delete options.headers["accept-encoding"];

    const proxyReq = this._requester.request(options, (proxyRes) => {
      const contentType = (proxyRes.headers["content-type"] || "").toLowerCase();
      const isHtml = contentType.includes("text/html");

      // Strip CSP headers that would block our injected inline script
      delete proxyRes.headers["content-security-policy"];
      delete proxyRes.headers["content-security-policy-report-only"];

      // Rewrite Location header for redirects (target host → proxy host)
      if (proxyRes.headers.location) {
        proxyRes.headers.location = proxyRes.headers.location
          .replace(this.target.origin, `http://localhost:${this.port}`);
      }

      if (isHtml) {
        // Buffer the HTML response, inject script, then send
        this._bufferAndInject(proxyRes, clientRes);
      } else {
        // Stream non-HTML responses directly
        // Remove content-encoding since we stripped accept-encoding
        delete proxyRes.headers["content-encoding"];
        clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(clientRes);
      }
    });

    proxyReq.on("error", (err) => {
      console.error("[InjectProxy] Request error:", err.message);
      if (!clientRes.headersSent) {
        clientRes.writeHead(502, { "content-type": "text/plain" });
      }
      clientRes.end(`Proxy error: ${err.message}`);
    });

    clientReq.pipe(proxyReq);
  }

  /**
   * Buffer an HTML response, inject the inspector script, and send.
   */
  _bufferAndInject(proxyRes, clientRes) {
    const chunks = [];
    const encoding = (proxyRes.headers["content-encoding"] || "").toLowerCase();

    // Determine decompression stream if needed
    let source = proxyRes;
    if (encoding === "gzip") {
      source = proxyRes.pipe(zlib.createGunzip());
    } else if (encoding === "deflate") {
      source = proxyRes.pipe(zlib.createInflate());
    } else if (encoding === "br") {
      source = proxyRes.pipe(zlib.createBrotliDecompress());
    }

    source.on("data", (chunk) => chunks.push(chunk));
    source.on("error", (err) => {
      console.error("[InjectProxy] Decompress error:", err.message);
      if (!clientRes.headersSent) {
        clientRes.writeHead(502, { "content-type": "text/plain" });
      }
      clientRes.end("Proxy decompression error");
    });
    source.on("end", () => {
      let html = Buffer.concat(chunks).toString("utf8");
      html = this._injectScript(html);

      // Remove content-encoding and update content-length
      const headers = { ...proxyRes.headers };
      delete headers["content-encoding"];
      delete headers["transfer-encoding"];
      headers["content-length"] = Buffer.byteLength(html, "utf8");

      clientRes.writeHead(proxyRes.statusCode, headers);
      clientRes.end(html);
    });
  }

  /**
   * Inject the inspector script into HTML content.
   * @param {string} html
   * @returns {string}
   */
  _injectScript(html) {
    const script = this.getInspectorScript();
    const tag = `<script data-gemini-inspector="injected">${script}<\/script>`;

    if (html.includes("</body>")) {
      return html.replace("</body>", tag + "\n</body>");
    }
    if (html.includes("</html>")) {
      return html.replace("</html>", tag + "\n</html>");
    }
    // Fallback: append at end
    return html + "\n" + tag;
  }

  /**
   * Handle WebSocket upgrade requests (proxied to target for HMR).
   */
  _handleUpgrade(clientReq, clientSocket, head) {
    const targetPort = this.target.port || (this._isHttps ? 443 : 80);

    const targetSocket = net.connect(
      { host: this.target.hostname, port: parseInt(targetPort) },
      () => {
        // Reconstruct the HTTP upgrade request
        const reqHeaders = [`${clientReq.method} ${clientReq.url} HTTP/1.1`];
        for (const [key, value] of Object.entries(clientReq.headers)) {
          if (key.toLowerCase() === "host") {
            reqHeaders.push(`Host: ${this.target.host}`);
          } else {
            reqHeaders.push(`${key}: ${value}`);
          }
        }
        reqHeaders.push("", "");

        targetSocket.write(reqHeaders.join("\r\n"));
        if (head && head.length > 0) {
          targetSocket.write(head);
        }

        // Pipe bidirectionally
        targetSocket.pipe(clientSocket);
        clientSocket.pipe(targetSocket);
      }
    );

    targetSocket.on("error", (err) => {
      console.error("[InjectProxy] WebSocket upgrade error:", err.message);
      clientSocket.destroy();
    });

    clientSocket.on("error", () => {
      targetSocket.destroy();
    });
  }

  /**
   * Find the first available port starting at startPort.
   * @param {number} startPort
   * @returns {Promise<number>}
   */
  async _findAvailablePort(startPort) {
    for (let offset = 0; offset < MAX_PORT_SEARCH; offset++) {
      const candidate = startPort + offset;
      const available = await new Promise((resolve) => {
        const server = net.createServer();
        server.once("error", () => resolve(false));
        server.once("listening", () => {
          server.close(() => resolve(true));
        });
        server.listen(candidate, "127.0.0.1");
      });
      if (available) return candidate;
    }
    throw new Error(`No available port found in range ${startPort}–${startPort + MAX_PORT_SEARCH - 1}`);
  }
}
