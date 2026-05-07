type MessageHandler = (msg: any) => void;

class InspectorWSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  constructor(port: number = 5175) {
    this.url = `ws://localhost:${port}`;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      console.log("[Inspector] WebSocket connected");
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { type, data } = msg;
        const typeHandlers = this.handlers.get(type);
        if (typeHandlers) {
          typeHandlers.forEach((h) => h(data));
        }
      } catch (err) {
        console.warn("[Inspector] Failed to parse message", err);
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
        this.reconnectAttempts++;
        console.log(`[Inspector] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        this.reconnectTimer = setTimeout(() => this.connect(), delay);
      } else {
        console.warn("[Inspector] Max reconnect attempts reached");
      }
    };

    this.ws.onerror = (err) => {
      console.warn("[Inspector] WebSocket error", err);
    };
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  off(type: string, handler: MessageHandler) {
    const typeHandlers = this.handlers.get(type);
    if (!typeHandlers) return;
    const idx = typeHandlers.indexOf(handler);
    if (idx !== -1) {
      typeHandlers.splice(idx, 1);
    }
  }

  send(type: string, data: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("[Inspector] WebSocket not open, cannot send", type);
      return;
    }
    this.ws.send(JSON.stringify({ type, data }));
  }

  disconnect() {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }
}

// Singleton instance - reads WS port from meta tag or defaults to 5175
export const wsClient = new InspectorWSClient(
  parseInt(
    document.querySelector('meta[name="ws-port"]')?.getAttribute("content") || "5175"
  )
);
