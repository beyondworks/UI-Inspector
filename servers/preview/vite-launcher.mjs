import { spawn } from "node:child_process";
import net from "node:net";

const READY_TIMEOUT_MS = 30000;
const SIGKILL_DELAY_MS = 3000;
const MAX_PORT_SEARCH = 20;

export class ViteLauncher {
  /**
   * Start a Vite dev server in the given project directory.
   * Resolves when the server signals readiness; rejects on timeout or error.
   *
   * @param {string} projectDir - Absolute path to the project root
   * @param {number} [port=5173]  - Preferred port
   * @returns {Promise<{ process: ChildProcess, url: string, port: number }>}
   */
  async start(projectDir, port = 5173) {
    const availablePort = await this.findAvailablePort(port);

    return new Promise((resolve, reject) => {
      // stdio MUST be ["ignore", "pipe", "pipe"] — MCP uses stdio for transport
      const viteProcess = spawn(
        "npx",
        ["vite", "--port", String(availablePort), "--host", "--strictPort"],
        {
          cwd: projectDir,
          stdio: ["ignore", "pipe", "pipe"],
          env: { ...process.env, FORCE_COLOR: "0" },
        }
      );

      let settled = false;
      const url = `http://localhost:${availablePort}`;

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.stop(viteProcess).catch(() => {});
        reject(new Error(`Vite server timed out after ${READY_TIMEOUT_MS}ms on port ${availablePort}`));
      }, READY_TIMEOUT_MS);

      const onData = (chunk) => {
        const text = chunk.toString();
        if (!settled && (text.includes("Local:") || text.includes("ready in"))) {
          settled = true;
          clearTimeout(timer);
          resolve({ process: viteProcess, url, port: availablePort });
        }
      };

      viteProcess.stdout.on("data", onData);
      viteProcess.stderr.on("data", onData);

      viteProcess.on("error", (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Failed to spawn Vite: ${err.message}`));
      });

      viteProcess.on("exit", (code, signal) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Vite exited unexpectedly (code=${code}, signal=${signal})`));
      });
    });
  }

  /**
   * Check whether a TCP port is available.
   * Resolves true if available, false if in use.
   *
   * @param {number} port
   * @returns {Promise<boolean>}
   */
  checkPort(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => {
        server.close(() => resolve(true));
      });
      server.listen(port, "127.0.0.1");
    });
  }

  /**
   * Find the first available port starting at startPort.
   *
   * @param {number} startPort
   * @returns {Promise<number>}
   */
  async findAvailablePort(startPort) {
    for (let offset = 0; offset < MAX_PORT_SEARCH; offset++) {
      const candidate = startPort + offset;
      const available = await this.checkPort(candidate);
      if (available) return candidate;
    }
    throw new Error(
      `No available port found in range ${startPort}–${startPort + MAX_PORT_SEARCH - 1}`
    );
  }

  /**
   * Gracefully stop a Vite child process.
   * Sends SIGTERM first; escalates to SIGKILL after SIGKILL_DELAY_MS if needed.
   *
   * @param {import("node:child_process").ChildProcess} viteProcess
   * @returns {Promise<void>}
   */
  stop(viteProcess) {
    return new Promise((resolve) => {
      if (!viteProcess || viteProcess.exitCode !== null || viteProcess.killed) {
        resolve();
        return;
      }

      const forceKill = setTimeout(() => {
        try {
          viteProcess.kill("SIGKILL");
        } catch {
          // already gone
        }
        resolve();
      }, SIGKILL_DELAY_MS);

      viteProcess.once("exit", () => {
        clearTimeout(forceKill);
        resolve();
      });

      try {
        viteProcess.kill("SIGTERM");
      } catch {
        clearTimeout(forceKill);
        resolve();
      }
    });
  }
}
