/**
 * Rule-based advice text for a nap, shown on the ふりかえり screen and
 * stored on `NapRecord.aiAdvice` for history ("過去のアドバイス").
 *
 * This is the **fallback**: `naps.service.createNap` calls
 * `generateNapAdvice` (Ollama, `ai.service.ts`) first and only uses
 * `buildAdvice` when that throws / times out. Same signature and stored
 * column either way.
 */

export type NapAdviceInput = {
  minutes: number;
  wakeStars: number;
  focusDeltaPt: number;
  /** "HH:MM" — nap start, for the timing comment. */
  start: string;
};

function durationComment(minutes: number): string {
  if (minutes < 8) return "少し短めでしたが、軽いリフレッシュにはなりました。";
  if (minutes <= 22) return "適切な長さで、深く眠りすぎずに起きられる仮眠でした。";
  if (minutes <= 30) return "やや長めでした。次は20分前後にするとより起きやすくなります。";
  return "長めの仮眠でした。目覚めが重い場合は25分以内をおすすめします。";
}

function wakeComment(wakeStars: number): string {
  if (wakeStars >= 4) return "目覚めも良好だったようです。";
  if (wakeStars === 3) return "まずまずの目覚めでした。";
  return "少し眠気が残ったようです。就寝時間を見直すと改善するかもしれません。";
}

function timingComment(start: string): string {
  const hour = Number(start.split(":")[0]);
  if (hour >= 13 && hour <= 15) return "時間帯も日中の眠気が出やすい頃で、タイミングは良かったです。";
  if (hour >= 16) return "やや遅めの時間でした。夕方以降の仮眠は夜の睡眠に影響することがあります。";
  return "";
}

function focusComment(focusDeltaPt: number): string {
  if (focusDeltaPt >= 15) return "仮眠後の集中度もはっきり上がっています。";
  if (focusDeltaPt > 0) return "仮眠後は少し集中しやすくなったようです。";
  return "";
}

export function buildAdvice(input: NapAdviceInput): string {
  return [
    durationComment(input.minutes),
    wakeComment(input.wakeStars),
    timingComment(input.start),
    focusComment(input.focusDeltaPt),
  ]
    .filter(Boolean)
    .join(" ");
}
