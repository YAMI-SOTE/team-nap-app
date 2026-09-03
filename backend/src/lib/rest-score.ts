/**
 * "休息スコア" (0–100) for a set of naps. Shared by the personal stats,
 * the team stats, the team ranking, and the Home team score so they never
 * drift apart.
 *
 *   napCount·15 + avgWakeStars·8 + avgFocusDelta, clamped to 0–100
 */
type ScoreInput = { wakeStars: number; focusDeltaPt: number };

const avg = (xs: number[]) =>
  xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;

export function restScore(entries: ScoreInput[]): number {
  if (entries.length === 0) return 0;
  const raw =
    entries.length * 15 +
    avg(entries.map((n) => n.wakeStars)) * 8 +
    avg(entries.map((n) => n.focusDeltaPt));
  return Math.max(0, Math.min(100, Math.round(raw)));
}
