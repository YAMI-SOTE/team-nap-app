// ========================================
// 型定義
// ========================================

// スケジュール上の空き時間
export type FreeTime = {
  start: string; // 例 "14:40"
  end: string; // 例 "15:20"
  durationMinutes: number;
};

// 休息判定に必要な入力
export type RestDecisionInput = {
  // ① 普段の就寝・起床時刻
  usualSleepStart: string; // 例 "23:30"
  usualWakeTime: string; // 例 "07:00"

  // ② 今日の睡眠時間
  todaySleepHours: number;

  // ③ 現在までの連続作業時間
  continuousWorkMinutes: number;

  // ④ 直近の休息終了時刻
  // 今日まだ休息していない場合は null
  lastRestTime: string | null;

  // ⑤ 現在時刻
  currentTime: string;

  // ⑥ スケジュール上の空き時間
  freeTimes: FreeTime[];
};

// 判定理由
export type RestReasonCode =
  | "HIGH_REST_NEED"
  | "REST_RECOMMENDED"
  | "RECENTLY_RESTED"
  | "NO_FREE_TIME"
  | "TOO_LATE"
  | "NO_REST_NEEDED";

// 判定結果
export type RestDecisionResult = {
  shouldRest: boolean;

  // 休息必要度スコア
  needScore: number;

  // 推奨する休息時間
  recommendedMinutes: number | null;

  // 推奨する開始・終了時刻
  recommendedStart: string | null;
  recommendedEnd: string | null;

  reasonCode: RestReasonCode;
};

// ========================================
// 調整可能な判定パラメータ
// ========================================

// 標準の休息時間
const RECOMMENDED_REST_MINUTES = 15;

// 睡眠不足
const MODERATE_SLEEP_DEFICIT_HOURS = 0.5;
const HIGH_SLEEP_DEFICIT_HOURS = 1;

// 連続作業
const MODERATE_WORK_MINUTES = 60;
const LONG_WORK_MINUTES = 120;

// 直近の休息
const RECENT_REST_MINUTES = 60;
const LONG_TIME_SINCE_REST_MINUTES = 120;

// 就寝前
const NO_REST_BEFORE_SLEEP_MINUTES = 120;

// 午後の優先時間帯
const PREFERRED_START_MINUTES = 13 * 60; // 13:00
const PREFERRED_END_MINUTES = 16 * 60; // 16:00

// この点数以上なら休息を提案
const REST_RECOMMEND_THRESHOLD = 2;

// この点数以上なら休息必要度が高い
const HIGH_REST_NEED_THRESHOLD = 5;

// ========================================
// 時刻関係の関数
// ========================================

// "14:30" → 870
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

// 日付をまたぐ場合にも対応して時刻差を求める
function minutesBetween(
  start: string,
  end: string
): number {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  let difference = endMinutes - startMinutes;

  if (difference < 0) {
    difference += 24 * 60;
  }

  return difference;
}

// 普段の睡眠時間を計算
function calculateUsualSleepHours(
  sleepStart: string,
  wakeTime: string
): number {
  return minutesBetween(sleepStart, wakeTime) / 60;
}

// 開始時刻から指定分後の時刻を作る
function addMinutesToTime(
  time: string,
  minutesToAdd: number
): string {
  const totalMinutes =
    (timeToMinutes(time) + minutesToAdd) %
    (24 * 60);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")}`;
}

// ========================================
// 空き時間関係
// ========================================

// 15分以上休める空き時間だけ取得
function getAvailableFreeTimes(
  freeTimes: FreeTime[]
): FreeTime[] {
  return freeTimes.filter(
    (freeTime) =>
      freeTime.durationMinutes >=
      RECOMMENDED_REST_MINUTES
  );
}

// 空き時間候補を評価
function calculateFreeTimeScore(
  freeTime: FreeTime,
  currentTime: string
): number {
  let score = 0;

  const startMinutes = timeToMinutes(freeTime.start);
  const currentMinutes = timeToMinutes(currentTime);

  // 15分以上確保できる
  if (
    freeTime.durationMinutes >=
    RECOMMENDED_REST_MINUTES
  ) {
    score += 2;
  }

  // 13:00〜16:00なら優先
  if (
    startMinutes >= PREFERRED_START_MINUTES &&
    startMinutes <= PREFERRED_END_MINUTES
  ) {
    score += 2;
  }

  // 現在から60分以内に始まるなら優先
  let minutesUntilFreeTime =
    startMinutes - currentMinutes;

  if (minutesUntilFreeTime < 0) {
    minutesUntilFreeTime += 24 * 60;
  }

  if (minutesUntilFreeTime <= 60) {
    score += 1;
  }

  return score;
}

// 最も条件の良い空き時間を選ぶ
function selectBestFreeTime(
  freeTimes: FreeTime[],
  currentTime: string
): FreeTime | null {
  if (freeTimes.length === 0) {
    return null;
  }

  const scoredFreeTimes = freeTimes.map(
    (freeTime) => ({
      freeTime,
      score: calculateFreeTimeScore(
        freeTime,
        currentTime
      ),
    })
  );

  scoredFreeTimes.sort((a, b) => {
    // スコアが高い方を優先
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    // 同点なら早い時間を優先
    return (
      timeToMinutes(a.freeTime.start) -
      timeToMinutes(b.freeTime.start)
    );
  });

  return scoredFreeTimes[0].freeTime;
}

// ========================================
// 休息しない場合の結果
// ========================================

function noRestResult(
  reasonCode: RestReasonCode,
  needScore = 0
): RestDecisionResult {
  return {
    shouldRest: false,
    needScore,
    recommendedMinutes: null,
    recommendedStart: null,
    recommendedEnd: null,
    reasonCode,
  };
}

// ========================================
// メインの休息判定
// ========================================

export function decideRestTiming(
  input: RestDecisionInput
): RestDecisionResult {
  const {
    usualSleepStart,
    usualWakeTime,
    todaySleepHours,
    continuousWorkMinutes,
    lastRestTime,
    currentTime,
    freeTimes,
  } = input;

  // ======================================
  // STEP 1：禁止条件
  // ======================================

  // 15分以上の空き時間があるか
  const availableFreeTimes =
    getAvailableFreeTimes(freeTimes);

  if (availableFreeTimes.length === 0) {
    return noRestResult("NO_FREE_TIME");
  }

  // 就寝までの時間
  const minutesUntilSleep = minutesBetween(
    currentTime,
    usualSleepStart
  );

  // 就寝2時間前以内なら提案しない
  if (
    minutesUntilSleep <=
    NO_REST_BEFORE_SLEEP_MINUTES
  ) {
    return noRestResult("TOO_LATE");
  }

  // 直近60分以内に休息していたら提案しない
  if (lastRestTime !== null) {
    const minutesSinceLastRest = minutesBetween(
      lastRestTime,
      currentTime
    );

    if (
      minutesSinceLastRest <
      RECENT_REST_MINUTES
    ) {
      return noRestResult("RECENTLY_RESTED");
    }
  }

  // ======================================
  // STEP 2：休息必要度スコア
  // ======================================

  let needScore = 0;

  // --------------------------------------
  // ①② 普段の睡眠時間と今日の睡眠時間
  // --------------------------------------

  const usualSleepHours =
    calculateUsualSleepHours(
      usualSleepStart,
      usualWakeTime
    );

  const sleepDeficitHours =
    usualSleepHours - todaySleepHours;

  if (
    sleepDeficitHours >=
    HIGH_SLEEP_DEFICIT_HOURS
  ) {
    // 普段より1時間以上少ない
    needScore += 2;
  } else if (
    sleepDeficitHours >=
    MODERATE_SLEEP_DEFICIT_HOURS
  ) {
    // 普段より30分以上少ない
    needScore += 1;
  }

  // --------------------------------------
  // ③ 連続作業時間
  // --------------------------------------

  if (
    continuousWorkMinutes >=
    LONG_WORK_MINUTES
  ) {
    // 120分以上
    needScore += 2;
  } else if (
    continuousWorkMinutes >=
    MODERATE_WORK_MINUTES
  ) {
    // 60〜119分
    needScore += 1;
  }

  // --------------------------------------
  // ④ 直近の休息
  // --------------------------------------

  if (lastRestTime === null) {
    // 今日まだ休んでいない
    needScore += 1;
  } else {
    const minutesSinceLastRest = minutesBetween(
      lastRestTime,
      currentTime
    );

    if (
      minutesSinceLastRest >=
      LONG_TIME_SINCE_REST_MINUTES
    ) {
      needScore += 1;
    }
  }

  // --------------------------------------
  // ⑤ 現在時刻
  // --------------------------------------

  const currentMinutes =
    timeToMinutes(currentTime);

  if (
    currentMinutes >= PREFERRED_START_MINUTES &&
    currentMinutes <= PREFERRED_END_MINUTES
  ) {
    needScore += 1;
  }

  // ======================================
  // STEP 3：休息が必要か
  // ======================================

  if (needScore < REST_RECOMMEND_THRESHOLD) {
    return noRestResult(
      "NO_REST_NEEDED",
      needScore
    );
  }

  // ======================================
  // STEP 4：最適な空き時間を選ぶ
  // ======================================

  const selectedFreeTime =
    selectBestFreeTime(
      availableFreeTimes,
      currentTime
    );

  if (selectedFreeTime === null) {
    return noRestResult(
      "NO_FREE_TIME",
      needScore
    );
  }

  const recommendedStart =
    selectedFreeTime.start;

  const recommendedEnd = addMinutesToTime(
    recommendedStart,
    RECOMMENDED_REST_MINUTES
  );

  // ======================================
  // STEP 5：結果を返す
  // ======================================

  const reasonCode: RestReasonCode =
    needScore >= HIGH_REST_NEED_THRESHOLD
      ? "HIGH_REST_NEED"
      : "REST_RECOMMENDED";

  return {
    shouldRest: true,
    needScore,
    recommendedMinutes:
      RECOMMENDED_REST_MINUTES,
    recommendedStart,
    recommendedEnd,
    reasonCode,
  };
}