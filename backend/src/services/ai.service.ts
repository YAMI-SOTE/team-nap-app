import { env } from "../config/env.js";

const OLLAMA_URL = env.OLLAMA_URL;
const OLLAMA_MODEL = env.OLLAMA_MODEL;

/**
 * How long a generated Home line stays fresh. Past this the next Home
 * request still gets the cached copy immediately and triggers a refresh
 * in the background — nobody ever waits on the model (see
 * `generateHomeComments`).
 */
const HOME_COMMENT_TTL_MS = 10 * 60_000;

/**
 * The LLM only rephrases evaluation codes the backend already computed, so
 * whenever Ollama is unreachable / slow / gives junk we can compose a
 * faithful Japanese sentence from the same codes. These are the fallbacks
 * for the personal / team comment endpoints (Home / nap advice have their
 * own inline fallbacks further down).
 */
const PERSONAL_DURATION_JA: Record<
  PersonalRestData["restDurationEvaluation"],
  string
> = {
  short: "少し短めの休息でした",
  appropriate: "ちょうどよい長さの休息でした",
  long: "やや長めの休息でした",
};

const PERSONAL_WAKE_JA: Record<PersonalRestData["wakeEvaluation"], string> = {
  good: "目覚めもすっきりしていたようです",
  normal: "目覚めはいつもどおりでした",
  sleepy: "起きたあとも少し眠気が残っていたようです",
};

const PERSONAL_SELF_JA: Record<
  PersonalRestData["selfInitiatedEvaluation"],
  string
> = {
  self: "自分のタイミングで休めていました",
  notification: "通知をきっかけに休めていました",
};

export function personalFallbackComment(data: PersonalRestData): string {
  return `${PERSONAL_DURATION_JA[data.restDurationEvaluation]}。${
    PERSONAL_WAKE_JA[data.wakeEvaluation]
  }。${PERSONAL_SELF_JA[data.selfInitiatedEvaluation]}。`;
}

const TEAM_REST_JA: Record<TeamRestData["teamRestEvaluation"], string> = {
  good: "チーム全体の休息状態は良好です",
  normal: "チーム全体の休息状態は標準的です",
  needs_improvement: "チーム全体の休息状態には改善の余地があります",
};

const TEAM_ENCOURAGEMENT_JA: Record<
  TeamRestData["encouragementEvaluation"],
  string
> = {
  active: "メンバー同士の声かけも活発です",
  normal: "メンバー同士の声かけは標準的です",
  low: "メンバー同士の声かけは少なめです",
};

export function teamFallbackComment(data: TeamRestData): string {
  return `${TEAM_REST_JA[data.teamRestEvaluation]}。${
    TEAM_ENCOURAGEMENT_JA[data.encouragementEvaluation]
  }。`;
}

// ---------------------------------------------------------------------------
// Personal rest comment
// ---------------------------------------------------------------------------

export type PersonalRestData = {
  sleepHours: number;
  restMinutes: number;
  restTime: string;
  wakeScore: number;
  selfInitiated: boolean;
  restFrequency: number;
  encouragedOthers: boolean;

  restDurationEvaluation: "short" | "appropriate" | "long";
  restTimingEvaluation: "early" | "good" | "late";
  wakeEvaluation: "good" | "normal" | "sleepy";
  restFrequencyEvaluation: "low" | "appropriate" | "high";
  selfInitiatedEvaluation: "self" | "notification";
};

export async function generatePersonalRestComment(
  data: PersonalRestData,
): Promise<string> {
  const prompt = `
あなたは休息支援アプリに表示する短いコメントの文章作成を担当します。

あなた自身がユーザーの状態を評価するのではなく、
バックエンドですでに判定された評価結果を
自然で短い日本語にしてください。

【最重要ルール】
・各Evaluationの判定結果を変更しないでください
・数値から独自に良い・悪いを判断しないでください
・入力されていない情報を推測しないでください
・休息時間や休息時刻について独自の基準で評価しないでください
・医学的な診断や効果の断定をしないでください
・強い命令表現は避けてください

【評価結果の意味】
restDurationEvaluation:
short = 休息時間が短い
appropriate = 休息時間が適切
long = 休息時間が長い

restTimingEvaluation:
early = 休息時刻が早い
good = 休息時刻が適切
late = 休息時刻が遅い

wakeEvaluation:
good = 目覚めが良い
normal = 目覚めは普通
sleepy = 目覚め後も眠気がある

restFrequencyEvaluation:
low = 休息頻度が少ない
appropriate = 休息頻度が適切
high = 休息頻度が多い

selfInitiatedEvaluation:
self = 自発的に休息を開始した
notification = 通知をきっかけに休息を開始した

【出力ルール】
・日本語のみ
・1〜2文
・100文字以内
・前置きは不要
・コメント本文だけを返してください

【入力データ】
${JSON.stringify(data, null, 2)}
`;

  try {
    return await callGemma(prompt);
  } catch (error) {
    console.error("Personal AI comment fell back to canned copy:", error);
    return personalFallbackComment(data);
  }
}

// ---------------------------------------------------------------------------
// Team rest comment
// ---------------------------------------------------------------------------

export type TeamRestData = {
  teamAverageScore: number;
  memberCount: number;
  averageRestMinutes: number;
  selfInitiatedRate: number;
  encouragementCount: number;

  teamRestEvaluation: "good" | "normal" | "needs_improvement";
  encouragementEvaluation: "active" | "normal" | "low";
};

export async function generateTeamRestComment(
  data: TeamRestData,
): Promise<string> {
  const prompt = `
あなたは休息支援アプリに表示する
チーム向けコメントの文章作成を担当します。

あなた自身がチームの状態を評価するのではなく、
バックエンドですでに判定された評価結果を
自然で短い日本語にしてください。

【最重要ルール】
・teamRestEvaluationとencouragementEvaluationの意味を変更しないでください
・teamAverageScoreなどの数値から独自に良い・悪いを判断しないでください
・入力されていない情報を推測しないでください
・個々のメンバーの状態を推測しないでください
・医学的な診断や効果の断定をしないでください
・強い命令表現は避けてください

【teamRestEvaluationの意味】
good = チーム全体の休息状態は良い
normal = チーム全体の休息状態は標準的
needs_improvement = チーム全体の休息状態には改善の余地がある

【encouragementEvaluationの意味】
active = メンバー同士の声かけが活発
normal = メンバー同士の声かけは標準的
low = メンバー同士の声かけが少ない

【出力ルール】
・日本語のみ
・1〜2文
・100文字以内
・前置きは不要
・コメント本文だけを返してください

【入力データ】
${JSON.stringify(data, null, 2)}
`;

  try {
    return await callGemma(prompt);
  } catch (error) {
    console.error("Team AI comment fell back to canned copy:", error);
    return teamFallbackComment(data);
  }
}


// ---------------------------------------------------------------------------
// Nap reflection advice
// ---------------------------------------------------------------------------

export type NapAdviceAiData = {
  minutes: number;
  wakeStars: number;
  focusDeltaPt: number;
  start: string;
};

export async function generateNapAdvice(
  data: NapAdviceAiData,
): Promise<string> {
  const prompt = `
あなたは休息支援アプリの「仮眠後のふりかえり画面」に表示する
短いアドバイスの文章作成を担当します。

入力された仮眠データだけを使って、
今回の休息について自然で短い日本語のコメントを作成してください。

【入力項目】
minutes:
仮眠した時間（分）

wakeStars:
起床後の目覚めの自己評価。1〜5で、5が最も良い評価です。

focusDeltaPt:
仮眠後の集中度を表す値です。
正の値は集中しやすい状態、負の値は集中しにくい状態を表します。

start:
仮眠を開始した時刻です。

【最重要ルール】
・入力されていない情報を推測しないでください
・医学的な診断や効果の断定をしないでください
・ユーザーを責める表現を使わないでください
・強い命令表現を避けてください
・具体的すぎる健康上の助言をしないでください
・今回の仮眠についてのみコメントしてください

【出力ルール】
・日本語のみ
・1〜3文
・120文字以内
・前置きは不要
・コメント本文だけを返してください

【入力データ】
${JSON.stringify(data, null, 2)}
`;

  return callGemma(prompt, 60_000);
}

// ---------------------------------------------------------------------------
// Home AI comments
// ---------------------------------------------------------------------------

export type HomeAiData = {
  teamScore: number;

  teamEvaluation:
    | "good"
    | "normal"
    | "needs_improvement";
};

export type HomeAiComments = {
  headline: [string, string];
  aiAdvice: string;
};

const HOME_FALLBACK_HEADLINE: Record<HomeAiData["teamEvaluation"], string> = {
  good: "いい調子です",
  normal: "まずまずです",
  needs_improvement: "もうひと息です",
};

const HOME_FALLBACK_ADVICE: Record<HomeAiData["teamEvaluation"], string> = {
  good: "チーム全体として良い状態です。",
  normal: "チーム全体として標準的な状態です。",
  needs_improvement: "チーム全体として改善の余地があります。",
};

/** Canned Home copy — always correct, just not bespoke. */
export function homeFallbackComments(
  teamEvaluation: HomeAiData["teamEvaluation"],
): HomeAiComments {
  return {
    headline: ["今日のチームは", HOME_FALLBACK_HEADLINE[teamEvaluation]],
    aiAdvice: HOME_FALLBACK_ADVICE[teamEvaluation],
  };
}

type CachedHomeComments = { comments: HomeAiComments; expiresAt: number };

/**
 * The Home copy is only allowed to rephrase `teamEvaluation` (the prompt
 * forbids reading anything into the raw score), so there are exactly three
 * distinct answers for the whole deployment — worth keeping instead of
 * regenerating per user, per load.
 */
const homeCommentCache = new Map<
  HomeAiData["teamEvaluation"],
  CachedHomeComments
>();
/** One in-flight generation per evaluation, so a burst can't stampede Ollama. */
const homeCommentInFlight = new Set<HomeAiData["teamEvaluation"]>();

/** Test seam — drops the cached copy so a case starts from a cold cache. */
export function __resetHomeCommentCache(): void {
  homeCommentCache.clear();
  homeCommentInFlight.clear();
}

/**
 * Home copy for the team's current evaluation. **Never waits on Ollama.**
 *
 * Home is the app's first paint, and `GET /home/summary` is the request it
 * blocks on. Generating here inline cost every single load a full model
 * round-trip (~1.5s locally on `gemma3:1b`; past the old 6s budget — and so
 * the canned copy anyway — on the `gemma4:e2b` default, which needs ~24s
 * warm). Instead: serve what we have (cached line, else canned copy) and
 * refresh out of band, so the model cost is paid once per TTL by nobody.
 */
export async function generateHomeComments(
  data: HomeAiData,
): Promise<HomeAiComments> {
  const cached = homeCommentCache.get(data.teamEvaluation);

  // Stale is still better than canned, so serve it and refresh behind the
  // response rather than holding Home open for a regeneration.
  if (!cached || cached.expiresAt <= Date.now()) {
    void refreshHomeComments(data);
  }

  return cached?.comments ?? homeFallbackComments(data.teamEvaluation);
}

/**
 * Regenerate one evaluation's copy into the cache. Nobody is waiting on
 * this, so it gets the full `OLLAMA_TIMEOUT_MS` — a slow model now lands a
 * real line for the *next* load instead of timing out into canned copy on
 * every load. Never rejects.
 */
async function refreshHomeComments(data: HomeAiData): Promise<void> {
  if (homeCommentInFlight.has(data.teamEvaluation)) return;
  homeCommentInFlight.add(data.teamEvaluation);

  try {
    const response = await callGemma(homePrompt(data));
    const comments = parseHomeComments(response, data.teamEvaluation);
    homeCommentCache.set(data.teamEvaluation, {
      comments,
      expiresAt: Date.now() + HOME_COMMENT_TTL_MS,
    });
  } catch (error) {
    // Ollama down / slow / junk output — Home keeps serving the canned
    // copy and we simply try again on the next request.
    console.error("Home AI comment refresh failed:", error);
  } finally {
    homeCommentInFlight.delete(data.teamEvaluation);
  }
}

/**
 * Pull the `{ headline, aiAdvice }` object out of a model response,
 * falling back to the canned copy for anything malformed or over-long.
 */
export function parseHomeComments(
  response: string,
  teamEvaluation: HomeAiData["teamEvaluation"],
): HomeAiComments {
  const jsonStart = response.indexOf("{");
  const jsonEnd = response.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd < jsonStart) {
    return homeFallbackComments(teamEvaluation);
  }

  let parsed: { headline?: unknown; aiAdvice?: unknown };
  try {
    parsed = JSON.parse(response.slice(jsonStart, jsonEnd + 1)) as typeof parsed;
  } catch {
    return homeFallbackComments(teamEvaluation);
  }

  const headline =
    typeof parsed.headline === "string" ? parsed.headline.trim() : "";
  const aiAdvice =
    typeof parsed.aiAdvice === "string" ? parsed.aiAdvice.trim() : "";
  if (!headline || !aiAdvice) {
    return homeFallbackComments(teamEvaluation);
  }

  return {
    headline: [
      "今日のチームは",
      headline.length <= 14 ? headline : HOME_FALLBACK_HEADLINE[teamEvaluation],
    ],
    aiAdvice,
  };
}

function homePrompt(data: HomeAiData): string {
  return `
あなたは休息支援アプリのHOME画面に表示する
短いコメントの文章作成を担当します。

HOME画面には2種類の文章を表示します。

1. headline
チーム全体の状態を一言で伝える短い見出しです。

2. aiAdvice
headlineの内容を少し詳しく説明する文章です。

チーム状態の評価はバックエンドですでに完了しています。
あなた自身で新しい評価を行わず、
teamEvaluationの判定結果を自然な日本語にしてください。

【最重要ルール】
・teamEvaluationの意味を変更しないでください
・teamScoreから独自に良い・悪いを判断しないでください
・teamEvaluationに含まれていない情報を推測しないでください
・チームメンバーの人数、行動、休息状況などを推測しないでください
・具体的な休息時間や休息方法を独自に提案しないでください
・医学的な診断や効果の断定をしないでください
・headlineとaiAdviceで評価を矛盾させないでください
・「〜しましょう」「〜してください」など、行動を促す表現は避けてください

【teamEvaluationの意味】
good = チーム全体の状態は良い
normal = チーム全体の状態は標準的
needs_improvement = チーム全体の状態には改善の余地がある

【出力ルール】
必ず以下のJSON形式だけで回答してください。
前置き、説明、Markdown、コードブロックは不要です。

{
  "headline": "短い見出し",
  "aiAdvice": "補足コメント"
}

headline:
・8文字程度
・必ず14文字以内
・teamEvaluationの評価だけを簡潔に表現してください
・やわらかく自然な日本語にしてください
・命令表現を使わないでください
・例:
  good → 「いい調子です」
  normal → 「まずまずです」
  needs_improvement → 「もうひと息です」

aiAdvice:
・teamEvaluationの意味を自然な日本語で説明してください
・新しい情報や評価を追加しないでください
・1文
・60文字以内
・穏やかな日本語にしてください
・例:
  good → 「チーム全体として良い状態です。」
  normal → 「チーム全体として標準的な状態です。」
  needs_improvement → 「チーム全体として改善の余地があります。」

【入力データ】
${JSON.stringify(data, null, 2)}
`;
}

// ---------------------------------------------------------------------------
// Ollama / Gemma
// ---------------------------------------------------------------------------

async function callGemma(
  prompt: string,
  timeoutMs = env.OLLAMA_TIMEOUT_MS,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs,
  );

  let response: Response;
  try {
    response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        // Keep the model resident for 30 min so only the very first call
        // after an idle period pays the load cost (which can exceed the
        // timeout and fall back).
        keep_alive: "30m",
        options: {
          temperature: 0.2,
        },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.status}`);
  }

  const result = (await response.json()) as {
    response?: string;
  };

  const cleanedResponse = sanitizeModelOutput(result.response);

  if (!cleanedResponse) {
    throw new Error("Ollama returned an empty response");
  }

  return cleanedResponse;
}

function sanitizeModelOutput(
  response: string | undefined,
): string {
  if (!response) {
    return "";
  }

  return response
    .replace(/<unused\d+>/gi, "")
    .replace(/<\/?tool[^>]*>/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}