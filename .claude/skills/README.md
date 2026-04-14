# Project Skills

このプロジェクト固有の Claude Code skill 一覧。UI 作成ワークフローを標準化するため、これらの skill を `/slash` コマンドから起動できる。

| Skill | 起動 | 用途 |
|-------|------|------|
| [ui-new-feature](./ui-new-feature/SKILL.md) | `/ui-new-feature <name>` | 新しい feature ディレクトリを scaffold |
| [ui-new-component](./ui-new-component/SKILL.md) | `/ui-new-component <feature> <name>` | feature 内にコンポーネント追加 |
| [ui-new-page](./ui-new-page/SKILL.md) | `/ui-new-page <path>` | App Router にページ追加 |
| [ui-review](./ui-review/SKILL.md) | `/ui-review <path>` | 設計ルールに照らしてセルフレビュー |

## ワークフロー

新機能実装時の標準フロー:

```
1. /ui-new-feature <name>         → feature ディレクトリ scaffold
2. /ui-new-component <f> <name>   → 必要なコンポーネントを追加
3. /ui-new-page <path>            → ページを作って feature を組み立てる
4. /ui-review <path>              → コミット前セルフレビュー
```

## 設計書

全ての skill は `docs/05_frontend_design.md` を正典として参照する。skill の指示内容と設計書が矛盾した場合、**設計書を優先** し、skill を更新する。
