# 依存パッケージの脆弱性対応

`npm audit fix --force` は **実行しない**。backend は Prisma 7 → 6、mobile は
Expo SDK 57 → 46 へダウングレードされ、ビルドが壊れるため。

安全な範囲（`npm audit fix` の非 `--force` + `package.json` の `overrides`）で
対応した結果を以下にまとめる。

## backend — 0 件

| 対応 | 内容 |
| --- | --- |
| `npm audit fix`（非 force） | `qs`（moderate, Express 経由）を semver 範囲内でパッチ。ついでに `prisma` / `@prisma/client` / `@prisma/adapter-pg` を `7.10.0` に揃えた |
| `overrides.mysql2` = `^3.24.3` | Prisma CLI の transitive。**このプロジェクトは Postgres**（`@prisma/adapter-pg`）で `mysql2` は一度もロードされない。advisory `<=3.23.0` を回避 |
| `overrides.deepmerge-ts` = `^8.0.2` | `@prisma/config` が CLI 実行時のみ使用。入力は自前の設定ファイル（信頼済み）。advisory `<8.0.0` を回避 |

`cd backend && npm audit` → **found 0 vulnerabilities**。

## mobile — 14 件 → 3 件（受容）

### 解消した 11 件 — `overrides.uuid` = `^11.1.1`

`xcode`（`@expo/config-plugins` → `expo-splash-screen` の transitive）が使う
`uuid@7.0.3` の advisory（v3/v5/v6 で `buf` 引数使用時の境界チェック欠落）。
`xcode` は `uuid.v4()` を **引数なし**で呼ぶだけなので実際には発火しないが、
`uuid@11` へ上げても `v4()` の API は不変で、`xcode` は `expo prebuild` /
EAS iOS ビルド時のみ動く native ツールのため影響なし。`expo-doctor` 21/21、
`tsc --noEmit`、`expo export -p web` すべて通過を確認済み。

この 1 件を解消すると、これに transitive で連なる
`@expo/config` / `@expo/config-plugins` / `@expo/cli` / `@expo/metro-config` /
`@expo/prebuild-config` / `@expo/inline-modules` / `@expo/local-build-cache-provider` /
`expo` / `expo-splash-screen` の計 11 件がまとめて消える。

### 残り 3 件（moderate, 受容）— `decode-uri-component` → `query-string` → `expo-router`

- advisory: `decode-uri-component <=0.4.2` — 不正な percent-encoding の指数的
  デコードによる DoS（GHSA-vcc3-ghjq-m6fr）。
- 修正版は **0.5.0 のみ**で、これは **ESM 専用**。`expo-router@57` が固定して
  いる `query-string@7`（CommonJS）は `require('decode-uri-component')` で読み込む
  ため、`overrides` で 0.5.0 を差すと `decodeComponent is not a function` で
  **URL ルーティングが壊れる**（実際に確認済み → revert）。
- `query-string@8/9` も ESM 専用で、`expo-router` の `require('query-string')` を
  同様に壊す。
- 到達経路は expo-router の `getStateFromPath` / `getPathFromState`、すなわち
  **アプリ自身のディープリンク / Web の URL クエリ解析**のみ。サーバの攻撃面には
  存在しない。moderate かつ client-side。
- Expo が upstream で `query-string` を上げれば解消する。

`mobile/.npmrc` に `audit-level=high` を置き、`npm audit` が moderate で
非ゼロ終了して**ビルドチェーンを壊さない**ようにした（high / critical は従来通り
検知）。`npm install` 末尾のサマリ行（"3 moderate…"）は npm がレベルで抑制
できないため残るが、`audit=false` で監査自体を止めるのは避ける。

## 再検証コマンド

```bash
cd backend && npm audit          # → found 0 vulnerabilities
cd mobile  && npm audit; echo $? # → 3 moderate（既知）/ exit 0
cd mobile  && npx expo-doctor    # → 21/21
```
