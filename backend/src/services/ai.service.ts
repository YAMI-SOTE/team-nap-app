const OLLAMA_URL =
  process.env.OLLAMA_URL || "http://localhost:11434";

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL || "gemma4:2b";


// ========================================
// REST終了後：個人データ
// ========================================

export type PersonalRestData = {
  // 元データ
  sleepHours: number;
  restMinutes: number;
  restTime: string;
  wakeScore: number;
  selfInitiated: boolean;
  restFrequency: number;
  encouragedOthers: boolean;

  // ロジック側で判定済みの評価
  restDurationEvaluation: "short" | "appropriate" | "long";
  restTimingEvaluation: "early" | "good" | "late";
  wakeEvaluation: "good" | "normal" | "sleepy";
  restFrequencyEvaluation: "low" | "appropriate" | "high";
  selfInitiatedEvaluation: "self" | "notification";
};


// ========================================
// TEAM画面：チーム集計データ
// ========================================

export type TeamRestData = {
  // 集計済みデータ
  teamAverageScore: number;
  memberCount: number;
  averageRestMinutes: number;
  selfInitiatedRate: number;
  encouragementCount: number;

  // ロジック側で判定済みの評価
  teamRestEvaluation:
    | "good"
    | "normal"
    | "needs_improvement";

  encouragementEvaluation:
    | "active"
    | "normal"
    | "low";
};


// ========================================
// REST終了後：個人コメント生成
// ========================================

export async function generatePersonalRestComment(
  data: PersonalRestData
): Promise<string> {
  const prompt = `
あなたは休息支援アプリのREST終了後に表示する、
短い振り返りコメントを生成するAIです。

あなたの役割は、
バックエンドですでに評価された休息データを、
ユーザーに分かりやすい自然な日本語にまとめることだけです。

【重要なルール】
・数値から新しい評価を行わないでください
・休むべきタイミングを判断しないでください
・休息時間を決定・推奨しないでください
・通知するかどうかを判断しないでください
・入力データにない情報を追加しないでください
・医学的な診断や断定をしないでください
・evaluationで与えられた評価を優先してください
・ユーザーを責めたり、不安を煽ったりしないでください
・今回の休息結果や最近の傾向についてコメントしてください
・必ず自然な日本語だけで回答してください
・他の言語や不自然な文字を混ぜないでください
・1〜2文で回答してください
・100文字以内にしてください
・前置きや箇条書きは不要です
・コメント本文だけを出力してください

【評価ラベルの意味】
restDurationEvaluation:
short = 休息時間が短め
appropriate = 休息時間が適切
long = 休息時間が長め

restTimingEvaluation:
early = 休息時刻が早め
good = 休息時刻が適切
late = 休息時刻が遅め

wakeEvaluation:
good = 目覚めが良い
normal = 目覚めは普通
sleepy = まだ眠気がある

restFrequencyEvaluation:
low = 休息頻度が少なめ
appropriate = 休息頻度が適切
high = 休息頻度が多め

selfInitiatedEvaluation:
self = 自発的に休息した
notification = 通知をきっかけに休息した

【入力データ】
${JSON.stringify(data, null, 2)}

上記の評価済みデータをもとに、
今回の休息について短い振り返りコメントを生成してください。
`;

  return callGemma(prompt);
}


// ========================================
// TEAM画面：チームコメント生成
// ========================================

export async function generateTeamRestComment(
  data: TeamRestData
): Promise<string> {
  const prompt = `
あなたは休息支援アプリのTEAM画面に表示する、
チーム全体への短いコメントを生成するAIです。

あなたの役割は、
バックエンドですでに集計・評価されたチームデータを、
自然な日本語で簡潔にまとめることだけです。

【重要なルール】
・数値から新しい評価を行わないでください
・チームの良し悪しを独自に判断しないでください
・休むタイミングを判断しないでください
・休息時間を決定・推奨しないでください
・通知するかどうかを判断しないでください
・入力データにない情報を追加しないでください
・teamRestEvaluationとencouragementEvaluationを評価結果として使用してください
・チームやメンバーを責める表現は避けてください
・休息しやすい雰囲気につながる表現にしてください
・必ず自然な日本語だけで回答してください
・他の言語や不自然な文字を混ぜないでください
・1〜2文で回答してください
・100文字以内にしてください
・前置きや箇条書きは不要です
・コメント本文だけを出力してください

【評価ラベルの意味】
teamRestEvaluation:
good = チーム全体として休息状況が良い
normal = チーム全体として標準的な休息状況
needs_improvement = チーム全体として休息状況に改善の余地がある

encouragementEvaluation:
active = メンバー同士の休息を促す行動が活発
normal = メンバー同士の休息を促す行動は標準的
low = メンバー同士の休息を促す行動が少なめ

【入力データ】
${JSON.stringify(data, null, 2)}

上記の評価済みデータをもとに、
チーム全体への短いコメントを生成してください。
`;

  return callGemma(prompt);
}


// ========================================
// Ollama / Gemma 3 1Bとの通信
// ========================================

async function callGemma(
  prompt: string
): Promise<string> {
  const response = await fetch(
    `${OLLAMA_URL}/api/generate`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,

        // 出力のばらつきを抑える
        options: {
          temperature: 0.2,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Ollama request failed: ${response.status}`
    );
  }

  const result = (await response.json()) as {
    response?: string;
  };

  if (
    !result.response ||
    result.response.trim() === ""
  ) {
    throw new Error(
      "Ollama returned an empty response"
    );
  }

  return result.response.trim();
}