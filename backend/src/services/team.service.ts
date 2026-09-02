import type { MemberActivity } from "@prisma/client";

import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { isUniqueViolation } from "../lib/prisma-errors.js";
import { step } from "../lib/api-flow.js";
import { addNotification } from "./notifications.service.js";
import { broadcastTeamMembers, closeUserSockets } from "../realtime/hub.js";
import type { Member, MemberStatus, WeeklyBarState } from "../types/domain.js";

// ---------------------------------------------------------------------------
// Team dashboard (今週の Team Nap) — static snapshot, only meaningful while
// the user belongs to a team. (Out of scope: making this DB-derived.)
// ---------------------------------------------------------------------------

type TeamWeeklyBar = {
  label: string;
  ratio: number;
  state: WeeklyBarState;
};

export type TeamSummaryResponse = {
  weekly: {
    ratePercent: number;
    deltaPercent: number;
    bars: TeamWeeklyBar[];
  };
  suggestion: {
    headline: [string, string];
    body: string;
    napMinutes: number;
  };
  achievement: string;
};

const teamSummarySnapshot: TeamSummaryResponse = {
  weekly: {
    ratePercent: 31,
    deltaPercent: 14,
    bars: [
      { label: "月", ratio: 0.67, state: "past" },
      { label: "火", ratio: 0.75, state: "past" },
      { label: "水", ratio: 0.83, state: "past" },
      { label: "木", ratio: 0.1, state: "past" },
      { label: "金", ratio: 0.79, state: "today" },
      { label: "土", ratio: 0.12, state: "future" },
      { label: "日", ratio: 0.12, state: "future" },
    ],
  },
  suggestion: {
    headline: ["チームは長時間", "がんばっています"],
    body: "いっしょにリフレッシュしませんか？",
    napMinutes: 15,
  },
  achievement: "今週は全員が1日1回以上仮眠しました",
};

// ---------------------------------------------------------------------------
// Current team membership — Prisma-backed. `null` means the user has not
// joined a team yet (Team tab shows the empty state).
// ---------------------------------------------------------------------------

export type TeamRole = "owner" | "member";

export type TeamSettingsMember = Member & {
  /** Display name, or null if the member never set one. */
  name: string | null;
  role: TeamRole;
  /** True for the member row that is the caller. */
  isSelf: boolean;
};

export type TeamSettingsResponse = {
  teamName: string;
  memberCount: number;
  inviteCode: string;
  /** True when the caller is the team owner (can rename / remove members). */
  canManage: boolean;
  members: TeamSettingsMember[];
};

/** Activity is stored as `online | resting`; "offline" is not modelled. */
export function mapActivity(activity: MemberActivity): MemberStatus {
  return activity === "resting" ? "resting" : "working";
}

function initial(name: string | null): string {
  return name?.trim().slice(0, 1).toUpperCase() || "M";
}

/** Compare codes on their alphanumerics only, so "NAP-4821" == "nap4821". */
export function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function generateInviteCode(): string {
  return `NAP-${Math.floor(1000 + Math.random() * 9000)}`;
}

async function uniqueInviteCode(): Promise<{ code: string; normalized: string }> {
  for (let i = 0; i < 20; i += 1) {
    const code = generateInviteCode();
    const clash = await prisma.team.findUnique({ where: { inviteCode: code } });
    if (!clash) return { code, normalized: normalizeCode(code) };
  }
  throw new HttpError(500, "招待コードを発行できませんでした");
}

/**
 * Team routes run behind `authenticate`, so the caller is normally a real
 * `User` already. This stays as a safety net for the legacy `X-User-Id`
 * path (other feature routes) and is a no-op for an existing user.
 */
async function ensureUser(userId: string) {
  return prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email: `${userId}@dev.local` },
  });
}

const teamWithMembers = {
  members: {
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  },
} as const;

type TeamWithMembers = {
  name: string;
  inviteCode: string;
  members: {
    userId: string;
    activity: MemberActivity;
    role: string;
    user: { name: string | null };
  }[];
};

function toSettings(
  team: TeamWithMembers,
  callerUserId: string,
): TeamSettingsResponse {
  const members: TeamSettingsMember[] = team.members.map((m) => ({
    id: m.userId,
    label: initial(m.user.name),
    name: m.user.name?.trim() || null,
    status: mapActivity(m.activity),
    role: m.role === "owner" ? "owner" : "member",
    isSelf: m.userId === callerUserId,
  }));
  return {
    teamName: team.name,
    memberCount: members.length,
    inviteCode: team.inviteCode,
    canManage: members.some((m) => m.isSelf && m.role === "owner"),
    members,
  };
}

async function findMembership(userId: string) {
  return prisma.teamMembership.findUnique({
    where: { userId },
    include: { team: { include: teamWithMembers } },
  });
}

export async function hasTeam(userId: string): Promise<boolean> {
  return (await prisma.teamMembership.count({ where: { userId } })) > 0;
}

export async function getCurrentTeam(
  userId: string,
): Promise<TeamSettingsResponse | null> {
  const membership = await findMembership(userId);
  return membership ? toSettings(membership.team, userId) : null;
}

export async function getTeamSummary(
  userId: string,
): Promise<TeamSummaryResponse | null> {
  return (await hasTeam(userId)) ? teamSummarySnapshot : null;
}

export async function createTeam(
  userId: string,
  name: string,
): Promise<TeamSettingsResponse> {
  step("service", "team.createTeam", { name });
  if (await hasTeam(userId)) {
    throw HttpError.conflict("既にチームに参加しています");
  }
  await ensureUser(userId);
  const invite = await uniqueInviteCode();
  try {
    const team = await prisma.team.create({
      data: {
        name,
        inviteCode: invite.code,
        inviteCodeNormalized: invite.normalized,
        // The creator is the team owner.
        members: { create: { userId, role: "owner" } },
      },
      include: teamWithMembers,
    });
    return toSettings(team, userId);
  } catch (err) {
    // Lost a race with a concurrent create/join for the same user.
    if (isUniqueViolation(err)) {
      throw HttpError.conflict("既にチームに参加しています");
    }
    throw err;
  }
}

export async function joinTeam(
  userId: string,
  inviteCode: string,
): Promise<TeamSettingsResponse> {
  step("service", "team.joinTeam", { inviteCode });
  if (await hasTeam(userId)) {
    throw HttpError.conflict("既にチームに参加しています");
  }

  // Indexed lookup on the normalized column (no full-table scan).
  const target = await prisma.team.findUnique({
    where: { inviteCodeNormalized: normalizeCode(inviteCode) },
    select: { id: true },
  });
  if (!target) {
    throw HttpError.notFound("招待コードが正しくありません");
  }

  const user = await ensureUser(userId);
  try {
    await prisma.teamMembership.create({
      data: { teamId: target.id, userId },
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw HttpError.conflict("既にチームに参加しています");
    }
    throw err;
  }

  const members = await prisma.teamMembership.findMany({
    where: { teamId: target.id },
    select: { userId: true },
  });
  // Notify everyone who was already on the team (not the joiner).
  for (const m of members) {
    if (m.userId === userId) continue;
    addNotification(m.userId, {
      kind: "member_joined",
      title: `${user.name ?? "メンバー"}がチームに参加しました`,
      body: `チームは${members.length}人になりました`,
      timestamp: "たった今",
      read: false,
      group: "today",
    });
  }

  await broadcastTeamMembers(target.id);
  return (await getCurrentTeam(userId))!;
}

export async function renameTeam(
  userId: string,
  name: string,
): Promise<TeamSettingsResponse> {
  const membership = await findMembership(userId);
  if (!membership) {
    throw HttpError.notFound("変更するチームがありません");
  }
  await prisma.team.update({
    where: { id: membership.teamId },
    data: { name },
  });
  return (await getCurrentTeam(userId))!;
}

export async function leaveTeam(userId: string): Promise<void> {
  const membership = await prisma.teamMembership.findUnique({
    where: { userId },
  });
  if (!membership) return;

  await prisma.teamMembership.delete({ where: { userId } });
  closeUserSockets(userId);

  const remaining = await prisma.teamMembership.count({
    where: { teamId: membership.teamId },
  });
  if (remaining === 0) {
    await prisma.team.delete({ where: { id: membership.teamId } });
  } else {
    // If the owner left, hand ownership to the next-oldest member.
    if (membership.role === "owner") {
      const next = await prisma.teamMembership.findFirst({
        where: { teamId: membership.teamId },
        orderBy: { joinedAt: "asc" },
      });
      if (next) {
        await prisma.teamMembership.update({
          where: { id: next.id },
          data: { role: "owner" },
        });
      }
    }
    await broadcastTeamMembers(membership.teamId);
  }
}

/** Owner-only: remove another member from the team. */
export async function removeMember(
  actorUserId: string,
  targetUserId: string,
): Promise<TeamSettingsResponse> {
  if (actorUserId === targetUserId) {
    throw HttpError.badRequest("自分を削除することはできません");
  }
  const actor = await prisma.teamMembership.findUnique({
    where: { userId: actorUserId },
  });
  if (!actor) throw HttpError.notFound("チームに参加していません");
  if (actor.role !== "owner") {
    throw HttpError.forbidden("メンバーを削除できるのはオーナーだけです");
  }

  const target = await prisma.teamMembership.findUnique({
    where: { userId: targetUserId },
  });
  if (!target || target.teamId !== actor.teamId) {
    throw HttpError.notFound("対象のメンバーが見つかりません");
  }
  if (target.role === "owner") {
    throw HttpError.badRequest("オーナーは削除できません");
  }

  await prisma.teamMembership.delete({ where: { userId: targetUserId } });
  closeUserSockets(targetUserId);
  addNotification(targetUserId, {
    kind: "member_joined",
    title: "チームから退出しました",
    body: "オーナーによってチームから外されました",
    timestamp: "たった今",
    read: false,
    group: "today",
  });
  await broadcastTeamMembers(actor.teamId);
  return (await getCurrentTeam(actorUserId))!;
}

export async function setActivity(
  userId: string,
  activity: MemberActivity,
): Promise<TeamSettingsResponse> {
  const membership = await prisma.teamMembership.findUnique({
    where: { userId },
  });
  if (!membership) {
    throw HttpError.notFound("チームに参加していません");
  }
  await prisma.teamMembership.update({ where: { userId }, data: { activity } });
  await broadcastTeamMembers(membership.teamId);
  return (await getCurrentTeam(userId))!;
}

export async function getMyStatus(
  userId: string,
): Promise<{ status: MemberStatus }> {
  const membership = await prisma.teamMembership.findUnique({
    where: { userId },
  });
  if (!membership) {
    throw HttpError.notFound("チームに参加していません");
  }
  return { status: mapActivity(membership.activity) };
}

/**
 * Broadcast a "let's nap together" suggestion — one `team_nap_suggestion`
 * notification into every other team member's feed. Backs the
 * "◯分仮眠を提案" button on the Team screen.
 */
export async function suggestTeamNap(
  userId: string,
  minutes: number,
): Promise<{ success: true; notified: number }> {
  step("service", "team.suggestTeamNap", { minutes });
  const membership = await prisma.teamMembership.findUnique({
    where: { userId },
    include: {
      user: true,
      team: { include: { members: { select: { userId: true } } } },
    },
  });
  if (!membership) {
    throw HttpError.notFound("チームに参加していません");
  }

  const proposer = membership.user.name ?? "メンバー";
  let notified = 0;
  for (const m of membership.team.members) {
    if (m.userId === userId) continue;
    addNotification(m.userId, {
      kind: "team_nap_suggestion",
      title: `${proposer}さんからチーム仮眠の提案`,
      body: `${minutes}分、みんなで仮眠しませんか？`,
      timestamp: "たった今",
      read: false,
      group: "today",
    });
    notified += 1;
  }
  return { success: true, notified };
}

// ---------------------------------------------------------------------------
// 仮眠上手ランキング — still a static per-team snapshot (out of scope to
// compute from real nap data).
// ---------------------------------------------------------------------------

export type TeamRankingEntry = {
  id: string;
  name: string;
  label: string;
  status: MemberStatus;
  score: number;
};

export type TeamRankingResponse = {
  memberCount: number;
  entries: TeamRankingEntry[];
};

const rankingSnapshot: TeamRankingEntry[] = [
  { id: "m-a", name: "メンバーA", label: "A", status: "resting", score: 92 },
  { id: "m-b", name: "メンバーB", label: "B", status: "working", score: 88 },
  { id: "m-c", name: "メンバーC", label: "C", status: "offline", score: 76 },
  { id: "m-d", name: "メンバーD", label: "D", status: "working", score: 64 },
  { id: "m-e", name: "メンバーE", label: "E", status: "resting", score: 58 },
  { id: "m-f", name: "メンバーF", label: "F", status: "working", score: 55 },
  { id: "m-g", name: "メンバーG", label: "G", status: "offline", score: 51 },
  { id: "m-h", name: "メンバーH", label: "H", status: "working", score: 48 },
  { id: "m-i", name: "メンバーI", label: "I", status: "resting", score: 44 },
  { id: "m-j", name: "メンバーJ", label: "J", status: "working", score: 40 },
  { id: "m-k", name: "メンバーK", label: "K", status: "offline", score: 36 },
];

export async function getTeamRanking(
  userId: string,
): Promise<TeamRankingResponse | null> {
  if (!(await hasTeam(userId))) {
    return null;
  }
  const entries = [...rankingSnapshot].sort((a, b) => b.score - a.score);
  return { memberCount: entries.length, entries };
}
