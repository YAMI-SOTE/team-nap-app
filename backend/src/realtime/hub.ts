/**
 * Realtime presence over WebSocket. Clients connect to
 * `ws://<host>/api/v1/realtime?token=<bearer>`; on connect they get a
 * `member-status` snapshot for their team and then a fresh one every time
 * anyone on the team changes activity / joins / leaves.
 *
 * One-directional: clients still change their own status through
 * `PUT /api/v1/teams/me/status`; the hub only pushes.
 */

import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";

import { step } from "../lib/api-flow.js";
import { resolveSession } from "../services/session.service.js";
import {
  teamIdOf,
  teamMemberStatus,
} from "../services/team-presence.service.js";

export const REALTIME_PATH = "/api/v1/realtime";

type Client = WebSocket & {
  isAlive?: boolean;
  userId?: string;
  teamId?: string;
};

/** teamId -> the sockets currently watching that team. */
const byTeam = new Map<string, Set<Client>>();

function register(teamId: string, ws: Client): void {
  let set = byTeam.get(teamId);
  if (!set) {
    set = new Set();
    byTeam.set(teamId, set);
  }
  set.add(ws);
}

function unregister(ws: Client): void {
  if (!ws.teamId) return;
  const set = byTeam.get(ws.teamId);
  set?.delete(ws);
  if (set && set.size === 0) byTeam.delete(ws.teamId);
}

function sendJson(ws: Client, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

/** Push the current member-status snapshot to everyone watching `teamId`. */
export async function broadcastTeamMembers(teamId: string): Promise<void> {
  const set = byTeam.get(teamId);
  if (!set || set.size === 0) return;
  const snapshot = await teamMemberStatus(teamId);
  const message = JSON.stringify({ type: "member-status", data: snapshot });
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) ws.send(message);
  }
}

/**
 * Close every socket belonging to `userId` — call this when they leave or
 * are removed from a team so their client stops receiving that team's
 * updates.
 */
export function closeUserSockets(userId: string): void {
  for (const set of byTeam.values()) {
    for (const ws of set) {
      if (ws.userId === userId) ws.close(4003, "membership changed");
    }
  }
}

export function attachRealtime(server: Server): void {
  const wss = new WebSocketServer({ server, path: REALTIME_PATH });

  wss.on("connection", async (socket, req) => {
    const ws = socket as Client;
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });
    ws.on("close", () => unregister(ws));
    ws.on("error", () => unregister(ws));

    try {
      const url = new URL(req.url ?? "", "http://localhost");
      const token = url.searchParams.get("token") ?? "";
      const session = token ? await resolveSession(token) : null;
      if (!session) {
        ws.close(4001, "unauthorized");
        return;
      }

      const teamId = await teamIdOf(session.userId);
      if (!teamId) {
        ws.close(4002, "no team");
        return;
      }

      ws.userId = session.userId;
      ws.teamId = teamId;
      register(teamId, ws);
      step("service", "realtime: client connected", {
        userId: session.userId,
      });

      sendJson(ws, {
        type: "member-status",
        data: await teamMemberStatus(teamId),
      });
    } catch {
      ws.close(1011, "server error");
    }
  });

  // Drop sockets that stop answering pings.
  const heartbeat = setInterval(() => {
    for (const set of byTeam.values()) {
      for (const ws of set) {
        if (ws.isAlive === false) {
          ws.terminate();
          unregister(ws);
          continue;
        }
        ws.isAlive = false;
        ws.ping();
      }
    }
  }, 30_000);
  heartbeat.unref?.();
  wss.on("close", () => clearInterval(heartbeat));
}
