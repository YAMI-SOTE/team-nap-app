import { prisma } from "../lib/prisma.js";
import { deriveMemberStatus } from "./team-presence.service.js";
import { activeNapSession } from "./nap-session.service.js";
import type { MemberStatus } from "../types/domain.js";

export type MemberDetailResponse = {
  id: string;
  name: string;
  label: string;
  status: MemberStatus;
  /** Chosen avatar id, or null → client falls back to a default icon. */
  avatar: string | null;
  /** "仮眠の状況" card — present while the member is resting. */
  nap: {
    wakeAt: string;
    minutesRemaining: number;
  } | null;
  /** "起床サポート" card. */
  wakeSupport: {
    wakeAssistEnabled: boolean;
  };
};

function initial(name: string | null): string {
  return name?.trim().slice(0, 1).toUpperCase() || "M";
}

/**
 * Detail for a teammate of the caller. `undefined` when the target is
 * not on the caller's team (controller turns that into a 404).
 * `nap` is populated from the target's live `NapSession`
 * (`nap-session.service`) while they have the Rest timer open.
 */
export async function getMemberDetail(
  userId: string,
  targetId: string,
): Promise<MemberDetailResponse | undefined> {
  const me = await prisma.teamMembership.findUnique({ where: { userId } });
  if (!me) return undefined;

  const target = await prisma.teamMembership.findUnique({
    where: { userId: targetId },
    include: { user: true },
  });
  if (!target || target.teamId !== me.teamId) return undefined;

  const nap = await activeNapSession(target.userId);

  return {
    id: target.userId,
    name: target.user.name ?? "メンバー",
    label: initial(target.user.name),
    status: deriveMemberStatus(target.userId, target.activity, target.lastSeenAt),
    avatar: target.user.avatar ?? null,
    nap: nap
      ? { wakeAt: nap.wakeAt, minutesRemaining: nap.minutesRemaining }
      : null,
    wakeSupport: { wakeAssistEnabled: target.wakeAssistEnabled },
  };
}
