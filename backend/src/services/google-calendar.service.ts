/**
 * Real Google Calendar sync. Replaces the sample importer once a
 * `GoogleAccount` exists for the user.
 *
 *   syncCalendar()          incremental (or full) pull → CalendarEvent
 *   ensureCalendarWatch()   register / refresh an events.watch push channel
 *   stopCalendarWatch()     tear the channel down (disconnect)
 *   handleGoogleCalendarWebhook()  Google pinged us → incremental sync
 *   mapGoogleEvent()        pure Google-event → our-shape mapping (tested)
 *
 * Only title / time / all-day are stored. Access + refresh tokens are
 * kept encrypted (`secret-box`); a dead grant wipes the connection and
 * surfaces "re-connect needed".
 */

import crypto from "node:crypto";

import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { step } from "../lib/api-flow.js";
import { open, seal } from "../lib/secret-box.js";
import { calendarWeek, jstNow } from "../lib/datetime.js";
import {
  GOOGLE_CALENDAR_BASE,
  resolveGoogleClientId,
} from "../config/google.js";
import {
  GoogleGrantRevokedError,
  refreshAccessToken,
} from "./google-oauth.service.js";
import {
  applyGoogleEventChanges,
  clearGoogleEvents,
  type EventDraft,
} from "./schedule.service.js";

// --- Google event shape (only the fields we read) --------------------------

type GoogleDateTime = { date?: string; dateTime?: string; timeZone?: string };
type GoogleEvent = {
  id?: string;
  status?: string;
  summary?: string;
  start?: GoogleDateTime;
  end?: GoogleDateTime;
};

type GoogleDraft = EventDraft & { externalId: string };
type MappedEvent =
  | { externalId: string; deleted: true }
  | { externalId: string; draft: GoogleDraft };

/**
 * Google event → CalendarEvent draft. Pure. `status: "cancelled"` and
 * malformed timed events map to a deletion. Times are converted to the
 * Asia/Tokyo wall clock the rest of the app uses; an event whose end
 * rolls past midnight is clamped to 23:59 on its start day.
 */
export function mapGoogleEvent(item: GoogleEvent): MappedEvent {
  const externalId = String(item.id ?? "");
  if (!externalId) return { externalId, deleted: true };
  if (item.status === "cancelled") return { externalId, deleted: true };

  const title = (item.summary ?? "").trim() || "(無題)";
  const isAllDay = Boolean(item.start?.date && !item.start?.dateTime);

  if (isAllDay) {
    const date = item.start?.date;
    if (!date) return { externalId, deleted: true };
    return {
      externalId,
      draft: { externalId, title, date, start: "00:00", end: "23:59", allDay: true },
    };
  }

  const startStr = item.start?.dateTime;
  if (!startStr) return { externalId, deleted: true };
  const start = jstNow(new Date(startStr)); // { date: "YYYY-MM-DD", time: "HH:MM" }
  const endStr = item.end?.dateTime;
  const end = endStr ? jstNow(new Date(endStr)) : null;

  return {
    externalId,
    draft: {
      externalId,
      title,
      date: start.date,
      start: start.time,
      end: end && end.date === start.date ? end.time : "23:59",
      allDay: false,
    },
  };
}

// --- Access token handling ------------------------------------------------

/** Wipe a connection whose Google grant is gone; app account survives. */
export async function handleGrantRevoked(userId: string): Promise<void> {
  await prisma.googleAccount.deleteMany({ where: { userId } });
  await clearGoogleEvents(userId);
  await prisma.onboarding.updateMany({
    where: { userId },
    data: { calendarConnected: false, calendarLastSyncedAt: null },
  });
  step("service", "google: grant revoked, connection wiped", { userId });
}

async function getAccessToken(userId: string): Promise<string> {
  const account = await prisma.googleAccount.findUnique({ where: { userId } });
  if (!account) {
    throw HttpError.notFound("Google カレンダーが連携されていません");
  }
  if (account.accessTokenExpiresAt.getTime() - Date.now() > 60_000) {
    return open(account.accessTokenEnc);
  }
  if (!account.refreshTokenEnc) {
    await handleGrantRevoked(userId);
    throw HttpError.badRequest("Google カレンダーの再連携が必要です");
  }
  try {
    const refreshed = await refreshAccessToken(
      open(account.refreshTokenEnc),
      resolveGoogleClientId(),
    );
    await prisma.googleAccount.update({
      where: { userId },
      data: {
        accessTokenEnc: seal(refreshed.accessToken),
        accessTokenExpiresAt: refreshed.accessTokenExpiresAt,
        ...(refreshed.scope ? { scope: refreshed.scope } : {}),
      },
    });
    return refreshed.accessToken;
  } catch (err) {
    if (err instanceof GoogleGrantRevokedError) {
      await handleGrantRevoked(userId);
      throw HttpError.badRequest(
        "Google カレンダーの連携が解除されました。再度連携してください",
      );
    }
    throw err;
  }
}

// --- Event listing --------------------------------------------------------

/** [Sunday of this week 00:00 JST, +21 days) as RFC3339. */
function fullSyncWindow(): { timeMin: string; timeMax: string } {
  const { start } = calendarWeek();
  const min = new Date(`${start}T00:00:00+09:00`);
  const max = new Date(min.getTime() + 21 * 24 * 60 * 60 * 1000);
  return { timeMin: min.toISOString(), timeMax: max.toISOString() };
}

type ListResult = {
  items: GoogleEvent[];
  nextSyncToken: string | null;
  expired: boolean;
};

async function listEvents(
  accessToken: string,
  calendarId: string,
  syncToken: string | null,
): Promise<ListResult> {
  const items: GoogleEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;

  do {
    const params = new URLSearchParams({
      maxResults: "250",
      singleEvents: "true",
      showDeleted: syncToken ? "true" : "false",
    });
    if (syncToken) {
      params.set("syncToken", syncToken);
    } else {
      const w = fullSyncWindow();
      params.set("timeMin", w.timeMin);
      params.set("timeMax", w.timeMax);
    }
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(
      `${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(
        calendarId,
      )}/events?${params.toString()}`,
      { headers: { authorization: `Bearer ${accessToken}` } },
    );
    if (res.status === 410) {
      return { items, nextSyncToken: null, expired: true };
    }
    const body = (await res.json().catch(() => ({}))) as {
      items?: GoogleEvent[];
      nextPageToken?: string;
      nextSyncToken?: string;
      error?: { message?: string };
    };
    if (!res.ok) {
      throw HttpError.badGateway(
        `Google カレンダーの取得に失敗しました（${
          body.error?.message ?? res.status
        }）`,
      );
    }
    for (const it of body.items ?? []) items.push(it);
    pageToken = body.nextPageToken;
    if (body.nextSyncToken) nextSyncToken = body.nextSyncToken;
  } while (pageToken);

  return { items, nextSyncToken, expired: false };
}

// --- Sync ----------------------------------------------------------------

export type CalendarSyncResult = {
  connected: boolean;
  imported: number;
  deleted: number;
  fullResync: boolean;
};

/**
 * Pull the user's calendar into `CalendarEvent`. Incremental when a
 * `syncToken` is stored (and `full` isn't forced); a `410` from Google
 * transparently falls back to a full windowed resync that also prunes
 * Google events no longer present. Returns `{ connected: false }` (no-op)
 * when the user has no `GoogleAccount`.
 */
export async function syncCalendar(
  userId: string,
  opts: { full?: boolean } = {},
): Promise<CalendarSyncResult> {
  const account = await prisma.googleAccount.findUnique({ where: { userId } });
  if (!account) {
    return { connected: false, imported: 0, deleted: 0, fullResync: false };
  }

  const accessToken = await getAccessToken(userId);
  const requestedToken = opts.full ? null : account.syncToken;
  let fullResync = !requestedToken;

  const calendarIds = account.calendarIds.length
    ? account.calendarIds
    : ["primary"];

  const changes: GoogleDraft[] = [];
  const deletions: string[] = [];
  let latestSyncToken: string | null = account.syncToken;

  for (const calendarId of calendarIds) {
    let result = await listEvents(accessToken, calendarId, requestedToken);
    if (result.expired) {
      fullResync = true;
      result = await listEvents(accessToken, calendarId, null);
    }
    for (const item of result.items) {
      const mapped = mapGoogleEvent(item);
      if ("deleted" in mapped) deletions.push(mapped.externalId);
      else changes.push(mapped.draft);
    }
    if (result.nextSyncToken) latestSyncToken = result.nextSyncToken;
  }

  const applied = await applyGoogleEventChanges(userId, changes, deletions, {
    prune: fullResync,
  });

  await prisma.googleAccount.update({
    where: { userId },
    data: { syncToken: latestSyncToken, lastSyncedAt: new Date() },
  });
  await prisma.onboarding.updateMany({
    where: { userId },
    data: { calendarConnected: true, calendarLastSyncedAt: new Date() },
  });

  step("service", "google: calendar synced", {
    userId,
    imported: applied.imported,
    deleted: applied.deleted,
    fullResync,
  });
  return {
    connected: true,
    imported: applied.imported,
    deleted: applied.deleted,
    fullResync,
  };
}

// --- Push channel (events.watch) ---------------------------------------

function webhooksEnabled(): boolean {
  return Boolean(env.PUBLIC_BASE_URL && env.GOOGLE_WEBHOOK_TOKEN);
}

async function stopChannel(
  accessToken: string,
  channelId: string,
  resourceId: string,
): Promise<void> {
  await fetch(`${GOOGLE_CALENDAR_BASE}/channels/stop`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ id: channelId, resourceId }),
  }).catch(() => undefined);
}

/**
 * Make sure there's a live push channel for the user's primary calendar,
 * renewing it when it's within a day of expiry. No-op when webhooks
 * aren't configured (`PUBLIC_BASE_URL` + `GOOGLE_WEBHOOK_TOKEN`).
 */
export async function ensureCalendarWatch(userId: string): Promise<void> {
  if (!webhooksEnabled()) return;
  const account = await prisma.googleAccount.findUnique({ where: { userId } });
  if (!account) return;

  const renewAfter = Date.now() + 24 * 60 * 60 * 1000;
  const stillValid =
    account.watchChannelId &&
    account.watchExpiresAt &&
    account.watchExpiresAt.getTime() > renewAfter;
  if (stillValid) return;

  const accessToken = await getAccessToken(userId);

  if (account.watchChannelId && account.watchResourceId) {
    await stopChannel(
      accessToken,
      account.watchChannelId,
      account.watchResourceId,
    );
  }

  const channelId = crypto.randomUUID();
  const res = await fetch(
    `${GOOGLE_CALENDAR_BASE}/calendars/primary/events/watch`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        id: channelId,
        type: "web_hook",
        address: `${env.PUBLIC_BASE_URL}/api/v1/webhooks/google-calendar`,
        token: env.GOOGLE_WEBHOOK_TOKEN,
        params: { ttl: "604800" },
      }),
    },
  );
  if (!res.ok) {
    step("error", "google: events.watch failed", { status: res.status });
    return;
  }
  const body = (await res.json().catch(() => ({}))) as {
    resourceId?: string;
    expiration?: string;
  };
  await prisma.googleAccount.update({
    where: { userId },
    data: {
      watchChannelId: channelId,
      watchResourceId: body.resourceId ?? null,
      watchExpiresAt: body.expiration
        ? new Date(Number(body.expiration))
        : null,
    },
  });
}

/** Tear down the user's push channel (best effort). */
export async function stopCalendarWatch(userId: string): Promise<void> {
  const account = await prisma.googleAccount.findUnique({ where: { userId } });
  if (!account?.watchChannelId || !account.watchResourceId) return;
  try {
    await stopChannel(
      open(account.accessTokenEnc),
      account.watchChannelId,
      account.watchResourceId,
    );
  } catch {
    /* channel may already be gone / token stale — nothing to do */
  }
}

/**
 * Handle an inbound Google push. Validates the shared channel token,
 * ignores the initial `sync` handshake, and otherwise kicks off an
 * incremental sync for the channel's owner. Always resolves — the route
 * must answer 200 fast so Google doesn't retry.
 */
export async function handleGoogleCalendarWebhook(
  headers: Record<string, string | string[] | undefined>,
): Promise<void> {
  if (!webhooksEnabled()) return;
  const get = (k: string): string | undefined => {
    const v = headers[k];
    return Array.isArray(v) ? v[0] : v;
  };
  if (get("x-goog-channel-token") !== env.GOOGLE_WEBHOOK_TOKEN) return;
  if (get("x-goog-resource-state") === "sync") return;

  const channelId = get("x-goog-channel-id");
  if (!channelId) return;
  const account = await prisma.googleAccount.findFirst({
    where: { watchChannelId: channelId },
    select: { userId: true },
  });
  if (!account) return;
  await syncCalendar(account.userId).catch(() => undefined);
}
