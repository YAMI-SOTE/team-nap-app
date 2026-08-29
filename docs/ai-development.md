# AI機能 開発ガイド

## 1. 目的

Team Nap のAI機能を、Home・Rest・Teamなどの他機能から独立して開発できるようにする。

---

## 2. 現在実装されているAI機能

現在、以下2種類のコメント生成機能を実装している。

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

統合後はAPIを以下に統一する。

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

### 注意

現在のBackendではAI Routeが

```text
/api/ai
```

として直接登録されているため、統合作業後に

```text
/api/v1/ai
```

へ統一する。

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
