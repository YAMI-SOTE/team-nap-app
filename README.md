# TEAM-NAP-APP

チームメンバーの休息・睡眠・スケジュール情報をもとに、最適な休息タイミングを
提案するモバイルアプリケーション。React Native / Expo（モバイル）、Node.js /
Express + Prisma + PostgreSQL（API）、Ollama 上の Gemma（AI コメント生成）で
構成する。

## システム構成

```text
┌─────────────┐   REST /api/v1/*  (Bearer)   ┌──────────────────────────┐
│   Mobile    │  ─────────────────────────▶  │        Backend           │
│ Expo (RN)   │   WebSocket /api/v1/realtime │  Express 5 + TypeScript   │
└─────────────┘  ◀─────────────────────────  └───────────┬──────────────┘
                                                         │  Prisma 7 + adapter-pg
                                    ┌────────────────────┴────────────┐
                                    ▼                                 ▼
                            ┌────────────────┐               ┌──────────────────┐
                            │  PostgreSQL 17 │               │  Ollama (Gemma)  │
                            └────────────────┘               │  AI コメント生成  │
                                                             └──────────────────┘
```

Mobile は PostgreSQL / Ollama に直接アクセスせず、必ず Backend API を経由する。
全体像とレイヤリングは [docs/architecture.md](docs/architecture.md)。

## ディレクトリ構成

```text
team-nap-app/
├── mobile/        React Native / Expo アプリ
├── backend/       Express + Prisma API（この直下に package.json / tsconfig）
├── llm/           プロンプト資料（実行は Ollama）
├── docs/          設計・手順ドキュメント（入口: docs/README.md）
├── compose.yaml   Docker Compose（backend / db / ollama / ollama-pull）
└── README.md
```

> モノレポだが npm workspaces ではない。依存は `backend/` と `mobile/` で
> **別々に** `npm install` する。**ルートに `package.json` は無い**ので、
> `npm` 系コマンドは必ず `backend/` か `mobile/` の中で実行する。

## クイックスタート

```bash
# 1. Backend + DB + Ollama（Repository root で）
docker compose up --build

# 2. 別ターミナルで Mobile
cd mobile && npm install && npx expo start

# 3. 必要なら開発データ（テストアカウント + チーム）
docker compose exec backend npm run db:seed
```

`mobile/.env`（`mobile/.env.example` をコピー）:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
```

実機で確認する場合や、Backend をローカル（`npm run dev`）で動かす場合の値・
手順は [docs/setup.md](docs/setup.md)。疎通確認は
`curl http://localhost:3000/api/v1/health`。

## ドキュメント

入口は **[docs/README.md](docs/README.md)**（索引）。主なもの:

| | |
| --- | --- |
| [architecture.md](docs/architecture.md) | 全体構成・レイヤリング・データモデル |
| [setup.md](docs/setup.md) | 環境構築・起動・環境変数・トラブルシュート・VPS デプロイ |
| [backend.md](docs/backend.md) | Backend API（エンドポイント / リクエストフロー / 追加手順） |
| [db.md](docs/db.md) | Prisma スキーマ・ER 図・マイグレーション |
| [testing-guide.md](docs/testing-guide.md) / [test-account.md](docs/test-account.md) | 手動確認手順 / テストアカウント |
| [implementation-checklist.md](docs/implementation-checklist.md) | 実装点検チェックリストと残タスク |

## 開発フロー

- 機能単位で `develop` から feature ブランチを切り、`develop` へ PR。
- Expo パッケージは `npx expo install <pkg>` で追加（SDK 版に整合させる）。
  不整合の確認は `npx expo-doctor`。
- `npm audit fix --force` は依存を破壊的に更新しうるため実行前に内容を確認する。

## License

[LICENSE](./LICENSE) を参照。
