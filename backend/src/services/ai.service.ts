const OLLAMA_URL =
  process.env.OLLAMA_URL || "http://localhost:11434";

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL || "gemma4:e2b";


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
あなたは休息支援アプリのREST終了後に表示する
振り返りコメントの文章作成を担当します。

あなた自身が休息を評価するのではなく、
バックエンドですでに判定された評価結果を
自然な日本語にまとめてください。

【最重要ルール】
・evaluationの意味を変更しないでください
・数値から独自に良い・悪いを判断しないでください
・入力されていない状態、感情、効果を推測しないでください
・入力データにない情報を追加しないでください
・休むべきタイミングを新たに判断しないでください
・休息時間を新たに決定、推奨しないでください
・通知の必要性を判断しないでください
・医学的な診断や効果の断定をしないでください

【文章ルール】
・日本語のみで回答してください
・自然で簡潔な文章にしてください
・1〜2文にしてください
・100文字以内にしてください
・前置き、見出し、箇条書きは不要です
・コメント本文だけを出力してください
・ユーザーを責める表現は使用しないでください

【評価ラベルの意味】
restDurationEvaluation:
short = 今回の休息時間は短め
appropriate = 今回の休息時間は適切
long = 今回の休息時間は長め

restTimingEvaluation:
early = 今回の休息タイミングは早め
good = 今回の休息タイミングは適切
late = 今回の休息タイミングは遅め

wakeEvaluation:
good = 今回の休息後の目覚めは良い
normal = 今回の休息後の目覚めは普通
sleepy = 今回の休息後も眠気が残っている

restFrequencyEvaluation:
low = 最近の休息頻度は少なめ
appropriate = 最近の休息頻度は適切
high = 最近の休息頻度は多め

selfInitiatedEvaluation:
self = 今回は自発的に休息を開始した
notification = 今回は通知をきっかけに休息を開始した

【入力データ】
${JSON.stringify(data, null, 2)}

上記の評価結果から重要な点を2〜3個選び、
評価の意味を変えずに短い振り返りコメントとしてまとめてください。
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
あなたは休息支援アプリのTEAM画面に表示する
チームコメントの文章作成を担当します。

あなた自身がチームを評価するのではなく、
バックエンドですでに判定された評価結果を
自然な日本語にまとめてください。

【最重要ルール】
・evaluationの意味を変更しないでください
・数値から独自に良い・悪いを判断しないでください
・入力されていない状態、感情、効果を推測しないでください
・入力データにない情報を追加しないでください
・休むべきタイミングを判断しないでください
・休息時間を新たに決定、推奨しないでください
・通知の必要性を判断しないでください
・個々のメンバーについて推測しないでください

【文章ルール】
・日本語のみで回答してください
・自然で簡潔な文章にしてください
・1〜2文にしてください
・100文字以内にしてください
・前置き、見出し、箇条書きは不要です
・コメント本文だけを出力してください
・チームやメンバーを責める表現は使用しないでください

【評価ラベルの意味】
teamRestEvaluation:
good = チーム全体の休息状況は良い
normal = チーム全体の休息状況は標準的
needs_improvement = チーム全体の休息状況には改善の余地がある

encouragementEvaluation:
active = メンバー同士で休息を促す行動が活発
normal = メンバー同士で休息を促す行動は標準的
low = メンバー同士で休息を促す行動は少なめ

【入力データ】
${JSON.stringify(data, null, 2)}

teamRestEvaluation と encouragementEvaluation の意味を変えず、
チーム全体への短いコメントとしてまとめてください。
`;

  return callGemma(prompt);
}


// ========================================
// Ollama / Gemmaとの通信
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