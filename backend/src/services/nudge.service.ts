import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { addNotification } from "./notifications.service.js";

type NudgeKind = "wake" | "rest";

const COPY: Record<
  NudgeKind,
  { notification: "wake_request" | "rest_request"; verb: string; body: string }
> = {
  wake: {
    notification: "wake_request",
    verb: "「起きて〜」",
    body: "そろそろ起きる時間みたいです",
  },
  rest: {
    notification: "rest_request",
    verb: "「休んでね」",
    body: "少し休憩してみませんか？",
  },
};

/**
 * One member nudges a teammate. Both must be in the same team. A wake
 * nudge is refused if the target turned wake support off. Creates an
 * (in-memory) notification for the target; nudges are not persisted.
 */
export async function sendNudge(
  fromUserId: string,
  toUserId: string,
  kind: NudgeKind,
): Promise<{ success: true }> {
  if (fromUserId === toUserId) {
    throw HttpError.badRequest("You cannot nudge yourself");
  }

  const [from, to] = await Promise.all([
    prisma.teamMembership.findUnique({
      where: { userId: fromUserId },
      include: { user: true },
    }),
    prisma.teamMembership.findUnique({
      where: { userId: toUserId },
      include: { user: true },
    }),
  ]);

  if (!from) throw HttpError.notFound("You do not belong to a team");
  if (!to) throw HttpError.notFound("Member not found");
  if (from.teamId !== to.teamId) {
    throw HttpError.badRequest("That member is not on your team");
  }
  if (kind === "wake" && !to.wakeAssistEnabled) {
    throw HttpError.conflict("That member has wake support turned off");
  }

  const copy = COPY[kind];
  addNotification({
    kind: copy.notification,
    title: `${from.user.name ?? "メンバー"}から${copy.verb}`,
    body: copy.body,
    timestamp: "たった今",
    read: false,
    group: "today",
  });

  return { success: true };
}
