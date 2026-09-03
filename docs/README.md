# Team Nap ドキュメント

Team Nap の設計・手順ドキュメントの索引。まず [architecture.md](./architecture.md)
（全体像）と [setup.md](./setup.md)（動かし方）から。

## 全体像・設計

| ドキュメント | 内容 |
| --- | --- |
| [architecture.md](./architecture.md) | システム構成、Backend レイヤリング、Mobile 構成、データモデル一覧 |
| [db.md](./db.md) | Prisma スキーマの各テーブル、ER 図、マイグレーション一覧、運用ルール |
| [backend.md](./backend.md) | Backend API の全体像（エンドポイント、リクエストフロー、API フロートレース、追加手順） |
| [auth.md](./auth.md) | 認証・セッション・パスワード再設定・オンボーディング |
| [team-feature.md](./team-feature.md) | チーム機能（作成 / 参加 / 在席 / ナッジ / 提案 / WebSocket / メンバー管理） |
| [settings-architecture.md](./settings-architecture.md) | 設定タブの Screen ↔ hook ↔ API ↔ `Onboarding` 行の対応 |
| [ai-development.md](./ai-development.md) | AI コメント生成（Ollama / Gemma）の構成と編集ポイント |
| [notifications.md](./notifications.md) | 通知フィード（Postgres 永続化）と Expo プッシュ通知 |
| [google-integration.md](./google-integration.md) | **設計アウトライン（未実装）** — Google ログイン ＋ Google カレンダー連携 |

## セットアップ・テスト

| ドキュメント | 内容 |
| --- | --- |
| [setup.md](./setup.md) | 環境構築・起動（ローカル / Docker）、環境変数、トラブルシュート、VPS デプロイ |
| [testing-guide.md](./testing-guide.md) | 機能ごとの手動確認手順 |
| [test-account.md](./test-account.md) | シード投入されるテストアカウントとパスワード |
| [device-testing.md](./device-testing.md) | iPhone / Android 実機・複数アカウントでのテスト手順 |
| [implementation-checklist.md](./implementation-checklist.md) | リポジトリ全体の実装点検チェックリストと残タスク |
| [dependency-security.md](./dependency-security.md) | `npm audit` の対応方針・`overrides`・残存脆弱性の受容理由 |

## 前提（共通の約束事）

これらは各ドキュメントで繰り返さない。

- **モノレポだが npm workspaces ではない。** 依存は `backend/` と `mobile/` で
  別々に `npm install`。**ルートに `package.json` は無い**（`npm` 系は必ず
  `backend/` か `mobile/` の中で実行する）。
- **Mobile は DB / Ollama に直接触れない。** すべて Backend API（`/api/v1`）経由。
- **認証はグローバル。** `/health` と `/auth/{signup,login,password-reset/*}`
  以外の全 `/api/v1` ルートが `Authorization: Bearer <token>` 必須
  （`routes/index.ts` で一括）。呼び出しユーザーは常にセッションの `userId`。
- **エラーは日本語。** `HttpError` を throw → `errorHandler` が
  `{ error, details }` に整形。
- **「今週」= カレンダー週（日曜〜土曜）。** ローリング 7 日でも月曜始まりでもない
  （`lib/datetime.ts` の `calendarWeek`）。
- **型の契約は手動同期。** Backend の `export type` と
  `mobile/src/types/api.ts` に同じ形を持つ。変更時は両方直す。
- Google OAuth は対象外（カレンダー連携はサンプル取り込み）。
