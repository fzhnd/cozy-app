// Client-side Realtime Bridge connecting SSE (/api/realtime) and BroadcastChannel
export type RealtimeListener = (data: any) => void;

class RealtimeClient {
  private eventSource: EventSource | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Set<RealtimeListener> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;
  private clientId: string = Math.random().toString(36).slice(2) + Date.now().toString(36);

  constructor() {
    if (typeof window !== "undefined") {
      this.initBroadcastChannel();
      this.connectSSE();
    }
  }

  private initBroadcastChannel() {
    try {
      if ("BroadcastChannel" in window) {
        this.broadcastChannel = new BroadcastChannel("cozy_realtime_sync");
        this.broadcastChannel.onmessage = (event) => {
          if (event.data) {
            if (event.data._clientId && event.data._clientId === this.clientId) return;
            this.notifyListeners(event.data);
          }
        };
      }
    } catch (e) {
      console.warn("BroadcastChannel not supported in this browser context:", e);
    }
  }

  private connectSSE() {
    if (typeof window === "undefined" || this.isConnecting) return;
    if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) return;

    this.isConnecting = true;
    try {
      const es = new EventSource("/api/realtime");
      this.eventSource = es;

      es.onopen = () => {
        this.isConnecting = false;
      };

      es.onmessage = (event) => {
        try {
          if (!event.data || event.data === "connected") return;
          const data = JSON.parse(event.data);
          if (data._clientId && data._clientId === this.clientId) return;
          this.notifyListeners(data);
        } catch (err) {
          // Non-JSON or heartbeat
        }
      };

      es.onerror = () => {
        this.isConnecting = false;
        es.close();
        this.eventSource = null;
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.connectSSE();
          }, 2500);
        }
      };
    } catch (err) {
      this.isConnecting = false;
      if (!this.reconnectTimeout) {
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectTimeout = null;
          this.connectSSE();
        }, 3000);
      }
    }
  }

  public subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    if (!this.eventSource || this.eventSource.readyState === EventSource.CLOSED) {
      this.connectSSE();
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  public broadcastLocal(payload: any) {
    const msg = { ...payload, _clientId: this.clientId };
    try {
      this.broadcastChannel?.postMessage(msg);
    } catch (e) {}
    this.notifyListeners(payload);

    try {
      fetch("/api/realtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg)
      }).catch(() => {});
    } catch (e) {}
  }

  private notifyListeners(data: any) {
    this.listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (err) {
        console.error("Error in realtime listener:", err);
      }
    });
  }
}

// Global singleton instance on client
let clientInstance: RealtimeClient | null = null;

export function getRealtimeClient(): RealtimeClient {
  if (!clientInstance) {
    clientInstance = new RealtimeClient();
  }
  return clientInstance;
}

export function subscribeRealtime(listener: RealtimeListener): () => void {
  return getRealtimeClient().subscribe(listener);
}

export function broadcastLocalSync(payload: any) {
  getRealtimeClient().broadcastLocal(payload);
}
