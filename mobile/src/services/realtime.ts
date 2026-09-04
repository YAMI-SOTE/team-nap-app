import { config } from "@/constants/config";

import type {
  HomeMemberStatusResponse,
  NotificationItem,
} from "@/types/api";

/**
 * Realtime client. Opens a WebSocket to the backend hub
 * (`/api/v1/realtime?token=…`) and emits every frame the server pushes —
 * presence snapshots, new notifications, and "re-read this" invalidations.
 * Reconnects with backoff while a token is set.
 *
 * The client only receives — it changes its own status through the REST
 * endpoint (`setMyStatus`). React Native ships a global `WebSocket`, so
 * there is no extra dependency.
 */

/** What the server says has gone stale (see backend `RealtimeScope`). */
export type RealtimeScope = "team" | "member";

export type RealtimeEvent =
  /** Team roster + presence snapshot. */
  | { type: "member-status"; data: HomeMemberStatusResponse }
  /** A new feed item for this user — arrives without any push permission. */
  | { type: "notification"; data: NotificationItem }
  /** "Re-read this": the server changed something with no pushed payload. */
  | { type: "invalidate"; scope: RealtimeScope };

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
    if (this.token === token && this.isLive()) return;
    this.token = token;
    this.manuallyClosed = false;
    this.open();
  }

  /**
   * Reopen right now if the socket is not actually live.
   *
   * Call this when the app returns to the foreground: a suspended app can
   * come back holding a socket that is closed (or a zombie the OS killed
   * without firing `onclose`), and the backoff timer may be minutes away
   * from its next attempt. Presence is only as good as this socket, so on
   * foreground we retry immediately rather than waiting it out.
   */
  ensureConnected(): void {
    if (this.manuallyClosed || !this.token || this.isLive()) return;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.attempt = 0;
    this.ws?.close();
    this.ws = null;
    this.open();
  }

  /** True only while the socket is open or still handshaking. */
  private isLive(): boolean {
    return (
      this.ws !== null &&
      (this.ws.readyState === 0 /* CONNECTING */ ||
        this.ws.readyState === 1) /* OPEN */
    );
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
        if (
          parsed?.type === "member-status" ||
          parsed?.type === "notification" ||
          parsed?.type === "invalidate"
        ) {
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
