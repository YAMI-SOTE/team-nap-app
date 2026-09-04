/**
 * Realtime presence over WebSocket. Clients connect to
 * `ws://<host>/api/v1/realtime?token=<bearer>`; on connect they get a
 * `member-status` snapshot for their team and then a fresh one every time
 * anyone on the team changes activity / joins / leaves / comes online /
 * drops off.
 *
 * One-directional: clients still change their own status through the REST
 * API; the hub only pushes. Three frame types go out:
 *
 *   { type: "member-status", data }   team roster + presence (broadcast)
 *   { type: "notification",  data }   a new feed item (one user)
 *   { type: "invalidate", scope }     "refetch this" (broadcast)
 *
 * `invalidate` exists so server-side changes that are not presence — a
 * teammate starting a nap, a team being renamed — still reach an open
 * client without inventing a bespoke payload for each one. It is also the
 * only delivery path that works on web, where Expo push does not exist.
 *
 * The hub is also the authority on who is *here*: it keeps a socket index
 * per user and hands `team-presence.service` a probe (see
 * `setLivePresenceProbe`), so an open socket means "online" without
 * waiting for a `lastSeenAt` write.
 */

import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";

import { step } from "../lib/api-flow.js";
import { resolveSession } from "../services/session.service.js";
import {
  markDisconnected,
  markOffline,
  reconcileActivity,
  setLivePresenceProbe,
  teamIdOf,
  teamMemberStatus,
  touchLastSeen,
} from "../services/team-presence.service.js";

export const REALTIME_PATH = "/api/v1/realtime";

/**
 * How often to re-derive every watched team's roster and push it if it
 * changed. Presence decays on a clock (`OFFLINE_AFTER_MS`), and nothing
 * else fires an event when a member simply stops being around — without
 * this sweep a teammate who closed the app stayed 作業中 on everyone
 * else's screen until some unrelated mutation happened to broadcast.
 */
const SWEEP_INTERVAL_MS = 20_000;

/** How often to ping sockets to find dead ones. */
const PING_INTERVAL_MS = 30_000;

type Client = WebSocket & {
  isAlive?: boolean;
  userId?: string;
  teamId?: string;
};

/** teamId -> the sockets currently watching that team. */
const byTeam = new Map<string, Set<Client>>();
/** userId -> that user's own sockets (they may have several tabs/devices). */
const byUser = new Map<string, Set<Client>>();
/**
 * teamId -> the last snapshot we pushed, serialized. The sweep compares
 * against this so an unchanged roster costs one query and no traffic.
 */
const lastPushed = new Map<string, string>();

/** True while `userId` holds at least one open socket. */
export function isUserConnected(userId: string): boolean {
  const set = byUser.get(userId);
  if (!set) return false;
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) return true;
  }
  return false;
}

function register(teamId: string, ws: Client): void {
  let team = byTeam.get(teamId);
  if (!team) {
    team = new Set();
    byTeam.set(teamId, team);
  }
  team.add(ws);

  if (!ws.userId) return;
  let user = byUser.get(ws.userId);
  if (!user) {
    user = new Set();
    byUser.set(ws.userId, user);
  }
  user.add(ws);
}

function unregister(ws: Client): void {
  if (ws.teamId) {
    const team = byTeam.get(ws.teamId);
    team?.delete(ws);
    if (team && team.size === 0) {
      byTeam.delete(ws.teamId);
      lastPushed.delete(ws.teamId);
    }
  }

  if (ws.userId) {
    const user = byUser.get(ws.userId);
    user?.delete(ws);
    if (user && user.size === 0) byUser.delete(ws.userId);
  }
}

/** Push the current member-status snapshot to everyone watching `teamId`. */
export async function broadcastTeamMembers(teamId: string): Promise<void> {
  const set = byTeam.get(teamId);
  if (!set || set.size === 0) return;

  const snapshot = await teamMemberStatus(teamId);
  const message = JSON.stringify({ type: "member-status", data: snapshot });
  lastPushed.set(teamId, message);

  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) ws.send(message);
  }
}

/**
 * What a client should re-read when it gets an `invalidate` frame.
 *
 *   "team"   — team summary / settings / name / ranking
 *   "member" — a teammate's detail, including the live nap card
 */
export type RealtimeScope = "team" | "member";

/** Push a frame to every socket `userId` currently holds. */
export function sendToUser(userId: string, payload: unknown): void {
  const set = byUser.get(userId);
  if (!set || set.size === 0) return;
  const message = JSON.stringify(payload);
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) ws.send(message);
  }
}

/**
 * Tell everyone watching `teamId` that `scope` is stale. Deliberately
 * carries no data: the client re-reads through the same REST path it
 * already uses, so there is one shape of truth rather than two.
 */
export function broadcastInvalidate(
  teamId: string,
  scope: RealtimeScope,
): void {
  const set = byTeam.get(teamId);
  if (!set || set.size === 0) return;
  const message = JSON.stringify({ type: "invalidate", scope });
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) ws.send(message);
  }
}

/**
 * Re-derive every watched team and push only the ones whose roster
 * actually moved. This is what turns "offline" from a value that is
 * merely *computed* correctly on the next request into one that *arrives*
 * on its own.
 */
async function sweep(): Promise<void> {
  for (const teamId of [...byTeam.keys()]) {
    const set = byTeam.get(teamId);
    if (!set || set.size === 0) continue;

    try {
      const snapshot = await teamMemberStatus(teamId);
      const message = JSON.stringify({ type: "member-status", data: snapshot });
      if (lastPushed.get(teamId) === message) continue;

      lastPushed.set(teamId, message);
      for (const ws of set) {
        if (ws.readyState === WebSocket.OPEN) ws.send(message);
      }
    } catch (error) {
      // A failed sweep must not kill the interval — try again next tick.
      console.error(`presence sweep failed for team ${teamId}:`, error);
    }
  }
}

/**
 * Close every socket belonging to `userId` — call this when they leave or
 * are removed from a team so their client stops receiving that team's
 * updates.
 */
export function closeUserSockets(userId: string): void {
  const set = byUser.get(userId);
  if (!set) return;
  for (const ws of [...set]) ws.close(4003, "membership changed");
}

/**
 * Tear down a user's presence right now — for sign-out, where the session
 * is gone but `lastSeenAt` would otherwise keep them showing as 作業中 to
 * their team for the rest of the offline window.
 *
 * Order matters: clear the stored presence, drop the sockets (so the
 * connected-probe stops vouching for them), then tell the team.
 */
export async function dropUserPresence(userId: string): Promise<void> {
  const teamId = await markOffline(userId);
  closeUserSockets(userId);
  if (teamId) await broadcastTeamMembers(teamId);
}

export function attachRealtime(server: Server): void {
  const wss = new WebSocketServer({ server, path: REALTIME_PATH });

  // An open socket is the strongest presence signal we have; let the
  // roster builder consult it instead of relying on `lastSeenAt` alone.
  setLivePresenceProbe(isUserConnected);

  wss.on("connection", async (socket, req) => {
    const ws = socket as Client;
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
      // A live socket counts as presence even with no REST traffic.
      if (ws.userId) void touchLastSeen(ws.userId).catch(() => {});
    });

    // Losing the last socket starts this member's offline countdown. No
    // broadcast here on purpose: nothing has changed *yet*, and the sweep
    // pushes the transition the moment the grace period runs out.
    const teardown = () => {
      const { userId } = ws;
      unregister(ws);
      if (userId && !isUserConnected(userId)) {
        void markDisconnected(userId).catch(() => {});
      }
    };
    ws.on("close", teardown);
    ws.on("error", teardown);

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
      void touchLastSeen(session.userId).catch(() => {});
      // A nap the app never got to finish must not follow them back in.
      await reconcileActivity(session.userId).catch(() => false);
      step("service", "realtime: client connected", {
        userId: session.userId,
      });

      // One push serves both purposes: this socket is already registered,
      // so the broadcast delivers its initial snapshot *and* tells the
      // rest of the team that a member just came online.
      await broadcastTeamMembers(teamId);
    } catch {
      ws.close(1011, "server error");
    }
  });

  // Drop sockets that stop answering pings.
  const heartbeat = setInterval(() => {
    for (const set of byTeam.values()) {
      for (const ws of [...set]) {
        if (ws.isAlive === false) {
          ws.terminate();
          unregister(ws);
          continue;
        }
        ws.isAlive = false;
        ws.ping();
      }
    }
  }, PING_INTERVAL_MS);
  heartbeat.unref?.();

  const presenceSweep = setInterval(() => {
    void sweep();
  }, SWEEP_INTERVAL_MS);
  presenceSweep.unref?.();

  wss.on("close", () => {
    clearInterval(heartbeat);
    clearInterval(presenceSweep);
  });
}
