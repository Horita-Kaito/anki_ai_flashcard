# Project Agents

プロジェクト固有の Claude Code エージェント定義。共通ルールは `AGENTS.md` を正典とし、このディレクトリには Claude-native subagent 定義だけを置く。

## エージェント一覧

| Agent | 用途 | Model |
|-------|------|-------|
| [architecture-reviewer](./architecture-reviewer.md) | アーキテクチャ適合性の横断レビュー | Sonnet |
| [security-reviewer](./security-reviewer.md) | セキュリティ監査 | Sonnet |
| [ux-reviewer](./ux-reviewer.md) | UX/画面設計レビュー | Sonnet |
| [fullstack-implementer](./fullstack-implementer.md) | Backend+Frontend 横断の実装タスク | Opus |
| [test-writer](./test-writer.md) | テストコード作成 (PHPUnit/Vitest/Playwright) | Sonnet |

## Skills との使い分け

| やりたいこと | 使うもの |
|-------------|---------|
| 新規 feature/resource 作成 | **Skills** (`.agents/skills`) |
| コミット前のコードレビュー | **Skills** (`.agents/skills`) |
| プロジェクト全体の品質チェック | **Agents** (architecture/security/ux-reviewer) |
| 大規模な機能実装 | **Agent** (fullstack-implementer) |
| テスト追加・カバレッジ向上 | **Agent** (test-writer) |

## 設計原則

- **Skills** = `.agents/skills` の定型ワークフロー (scaffold, checklist 駆動レビュー)
- **Agents** = 判断が必要な非定型タスク (横断レビュー, 実装, テスト設計)
- 正典は常に `AGENTS.md`, `docs/05_frontend_design.md`, `docs/06_backend_design.md`, `docs/07_testing_strategy.md`
