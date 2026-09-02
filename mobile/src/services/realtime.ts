import { config } from "@/constants/config";

import type { HomeMemberStatusResponse } from "@/types/api";

/**
 * Realtime presence client. Opens a WebSocket to the backend hub
 * (`/api/v1/realtime?token=…`) and emits every `member-status` snapshot
 * the server pushes. Reconnects with backoff while a token is set.
 *
 * The client only receives — it changes its own status through the REST
 * endpoint (`setMyStatus`). React Native ships a global `WebSocket`, so
 * there is no extra dependency.
 */

export type RealtimeEvent = {
  type: "member-status";
  data: HomeMemberStatusResponse;
};

type Listener = (event: RealtimeEvent) => void;
type StatusListener = (connected: boolean) => void;

function wsUrl(token: string): string {
  const base = (config.apiUrl ?? "").replace(/^http/, "ws");
  return `${base}/realtime?token=${encodeURIComponent(token)}`;
}

class RealtimeClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  private manuallyClosed = false;

  connect(token: string): void {
    if (this.token === token && this.ws) return;
    this.token = token;
    this.manuallyClosed = false;
    this.open();
  }

  disconnect(): void {
    this.manuallyClosed = true;
    this.token = null;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.attempt = 0;
    this.ws?.close();
    this.ws = null;
    this.emitStatus(false);
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private open(): void {
    if (!this.token || !config.apiUrl) return;
    try {
      this.ws = new WebSocket(wsUrl(this.token));
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.attempt = 0;
      this.emitStatus(true);
    };

    this.ws.onmessage = (e) => {
      try {
        const parsed = JSON.parse(String(e.data)) as RealtimeEvent;
        if (parsed?.type === "member-status") {
          for (const l of this.listeners) l(parsed);
        }
      } catch {
        /* ignore malformed frames */
      }
    };

    this.ws.onerror = () => {
      /* onclose will follow and handle reconnect */
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.emitStatus(false);
      if (!this.manuallyClosed) this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.manuallyClosed || !this.token) return;
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * 2 ** this.attempt, 30_000);
    this.attempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, delay);
  }

  private emitStatus(connected: boolean): void {
    for (const l of this.statusListeners) l(connected);
  }
}

export const realtime = new RealtimeClient();
