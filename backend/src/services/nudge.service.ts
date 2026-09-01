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
 * nudge is refused if the target turned wake support off. Adds a
 * notification to the *target's* feed; the nudge itself is not persisted.
 */
export async function sendNudge(
  fromUserId: string,
  toUserId: string,
  kind: NudgeKind,
): Promise<{ success: true }> {
  if (fromUserId === toUserId) {
    throw HttpError.badRequest("自分には送れません");
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

  if (!from) throw HttpError.notFound("チームに参加していません");
  if (!to) throw HttpError.notFound("メンバーが見つかりません");
  if (from.teamId !== to.teamId) {
    throw HttpError.badRequest("そのメンバーは同じチームではありません");
  }
  if (kind === "wake" && !to.wakeAssistEnabled) {
    throw HttpError.conflict("相手が「起こしてもらう」設定をオフにしています");
  }

  const copy = COPY[kind];
  addNotification(toUserId, {
    kind: copy.notification,
    title: `${from.user.name ?? "メンバー"}から${copy.verb}`,
    body: copy.body,
    timestamp: "たった今",
    read: false,
    group: "today",
  });

  return { success: true };
}
