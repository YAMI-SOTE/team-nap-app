# AI機能 開発ガイド

## 1. 目的

Team Nap のAI機能を、Home・Rest・Teamなどの他機能から独立して開発できるようにする。

---

## 2. 現在実装されているAI機能

`ai.service.ts` に **Ollama（Gemma）呼び出し** が 3 種類、`nap-advice.service.ts`
に **ルールベース** が 1 種類ある。

| 機能 | 実装 | 呼び出し元 |
| --- | --- | --- |
| 個人RESTコメント | `generatePersonalRestComment`（Ollama + フォールバック） | `POST /api/v1/ai/personal-comment` |
| TEAMコメント | `generateTeamRestComment`（Ollama + フォールバック） | `POST /api/v1/ai/team-comment` |
| HOMEの見出し + aiAdvice | `generateHomeComments`（Ollama、JSON を要求してパース + フォールバック） | `home.service.getHomeSummary`（チーム所属時のみ） |
| ふりかえり画面の仮眠アドバイス | `generateNapAdvice`（Ollama） → 失敗時 `buildAdvice`（ルールベース、`nap-advice.service.ts`） | `naps.service.createNap` が生成し `NapRecord.aiAdvice` に保存。`GET /naps/:id` で ふりかえり画面が読む |

`callGemma` は `OLLAMA_TIMEOUT_MS`（既定 60 秒、env で調整可）でアボート。
モデルが落ちている / 遅い / 壊れた出力のとき、**4 機能すべてがフォールバック**
する（500 / 502 を返さない）:

- `generateNapAdvice` → `nap-advice.service.ts` の `buildAdvice`（ルールベース）
- `generatePersonalRestComment` / `generateTeamRestComment` → 評価コードから
  組み立てた日本語 1〜2 文（`personalFallbackComment` / `teamFallbackComment`）
- `generateHomeComments` → `teamEvaluation` ごとの定型 headline / aiAdvice

### モデル選定（`OLLAMA_MODEL`）

env ごとに指定する。フォールバックがあるので「未指定 = 常にルールベース」でも動く。

| モデル | 状況 |
| --- | --- |
| **`gemma4:e2b`（既定・~7.2GB）** | 日本語が最も自然。**ollama サービスに ~8GB RAM / 2CPU 必要**。生成はウォーム ~24 秒 / コールド（モデルロード込み）~45〜60 秒 → `OLLAMA_TIMEOUT_MS` を 60 秒に設定。RAM が足りないと `llama-server` が OOM kill（`signal: killed`）され、全機能がフォールバックする |
| `gemma3n:e2b`（~5.6GB） | 日本語は自然。所要リソースは `gemma4:e2b` とほぼ同じ（~8GB）。`OLLAMA_MODEL=gemma3n:e2b docker compose up` で切替 |
| `gemma3:1b`（~815MB） | 軽量フォールバック用。pull が速く、生成はコールド ~16 秒 / ウォーム ~5〜7 秒。4GB/1CPU でも動く。**日本語がやや不自然**（例：「良い眠りだったですね！…」）。RAM の少ないホストでは `OLLAMA_MODEL=gemma3:1b docker compose up` |
| （未指定 / Ollama なし） | 生成しない。全機能がルールベース／定型文にフォールバック |

既定は `gemma4:e2b`。ホスト（または Docker VM）の RAM が ~8GB に満たない場合は
`OLLAMA_MODEL=gemma3:1b` に落として「pull → 生成」が通る状態を優先する。

### 個人RESTコメント

REST終了後のユーザー情報をもとにAIコメントを生成する。

主な入力:

```text
sleepHours
restMinutes
restTime
wakeScore
selfInitiated
restFrequency
encouragedOthers
```

加えて、以下の評価値を利用する。

```text
restDurationEvaluation
restTimingEvaluation
wakeEvaluation
restFrequencyEvaluation
selfInitiatedEvaluation
```

### TEAMコメント

チーム全体の休息状況からAIコメントを生成する。

主な入力:

```text
teamAverageScore
memberCount
averageRestMinutes
selfInitiatedRate
encouragementCount
teamRestEvaluation
encouragementEvaluation
```

---

## 3. Frontend構成

AIテスト機能はHome画面から分離し、以下の構成を使用する。

```text
mobile/src/
├── app/
│   ├── index.tsx
│   ├── (tabs)/
│   │   └── home.tsx
│   │
│   └── (dev)/
│       └── ai-test.tsx
│
├── features/
│   └── ai-test/
│       └── AiTestScreen.tsx
│
├── services/
│   ├── api.ts
│   └── ai.ts
│
└── types/
    └── ai.ts
```

各ファイルの役割:

```text
app/(dev)/ai-test.tsx
    ↓
AIテスト用Route

features/ai-test/AiTestScreen.tsx
    ↓
AI動作確認用UI

services/ai.ts
    ↓
AI API呼び出し

services/api.ts
    ↓
共通HTTP Client

types/ai.ts
    ↓
AI入出力のTypeScript型
```

---

## 4. AI担当者が主に編集する場所

基本的には以下の範囲で開発する。

```text
mobile/src/features/ai-test/
mobile/src/services/ai.ts
mobile/src/types/ai.ts

backend/src/routes/ai.routes.ts
backend/src/controllers/        # AI関連Controller
backend/src/services/           # AI関連Service
```

特に理由がない限り、以下は変更しない。

```text
mobile/src/app/index.tsx
mobile/src/app/(tabs)/home.tsx
mobile/src/services/api.ts
backend/src/app.ts
```

`home.tsx` は別機能の開発で使用するため、AIの動作確認UIを追加しない。

---

## 5. FrontendからAI APIを呼ぶ方法

AI専用通信は `services/ai.ts` を使用する。

例:

```ts
import { api } from "@/services/api";
import type { PersonalRestData } from "@/types/ai";

type CommentResponse = {
  comment: string;
};

export async function generatePersonalRestComment(
  data: PersonalRestData,
): Promise<string> {
  const result = await api.post<CommentResponse>("/ai/personal-comment", data);

  return result.comment;
}
```

画面側から直接 `fetch()` は使用しない。

```text
UI
 ↓
services/ai.ts
 ↓
services/api.ts
 ↓
Backend
```

という順番にする。

---

## 6. API構成

AI ルートは他の機能と同じく `/api/v1` 配下（`routes/index.ts` で
`router.use("/ai", aiRoutes)`）。`authenticate` 必須。

```text
POST /api/v1/ai/personal-comment
POST /api/v1/ai/team-comment
```

Frontendでは `.env` にBackendのBase URLを設定する。

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
```

そのため `services/ai.ts` では、

```ts
api.post("/ai/personal-comment", data);
```

のように指定する。

---

## 7. AIテスト画面の起動

BackendをRepository Rootから起動する。

```bash
docker compose up -d --build
```

Backend確認:

```bash
curl http://localhost:3000/api/v1/health
```

次にFrontendを起動する。

```bash
cd mobile
npx expo start --localhost
```

iOS Simulatorの場合:

```text
i
```

を押す。

AIテスト画面はExpo Router上の

```text
/ai-test
```

として使用する。

AIテストはHome画面では行わない。

---

## 8. AI機能を変更するとき

例えば新しいAI評価項目を追加する場合:

```text
① types/ai.ts
      ↓
入力型を追加

② services/ai.ts
      ↓
Backendへ送信

③ Backend AI Route / Controller / Service
      ↓
新しい値を処理

④ AiTestScreen.tsx
      ↓
テストデータを追加

⑤ /ai-test で確認
```

この順番を基本とする。

---
