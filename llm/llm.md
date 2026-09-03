# LLM プロンプト資料

Team Nap の AI コメント生成に渡すプロンプトの資料置き場。実行は Ollama
（`backend/src/services/ai.service.ts`）。設計・編集ポイントは
[../docs/ai-development.md](../docs/ai-development.md)。

- `prompts/personal.txt` — 個人 REST コメント（`/ai/personal-comment`）
- `prompts/team.txt` — チーム REST コメント（`/ai/team-comment`）

これらは資料。実際に送るプロンプト文字列は `ai.service.ts` が組み立てる。
