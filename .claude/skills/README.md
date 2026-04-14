# Project Skills

このプロジェクト固有の Claude Code skill 一覧。UI/API 作成ワークフローを標準化する。

## フロントエンド

| Skill | 起動 | 用途 |
|-------|------|------|
| [ui-new-feature](./ui-new-feature/SKILL.md) | `/ui-new-feature <name>` | Feature ディレクトリを scaffold |
| [ui-new-component](./ui-new-component/SKILL.md) | `/ui-new-component <feature> <name>` | Feature 内にコンポーネント追加 |
| [ui-new-page](./ui-new-page/SKILL.md) | `/ui-new-page <path>` | App Router にページ追加 |
| [ui-review](./ui-review/SKILL.md) | `/ui-review <path>` | 設計ルール照合セルフレビュー |

**正典**: `docs/05_frontend_design.md`

## バックエンド

| Skill | 起動 | 用途 |
|-------|------|------|
| [api-new-resource](./api-new-resource/SKILL.md) | `/api-new-resource <name>` | Interface + Repository + Service + Controller + Request + Resource + Policy + Model + Migration + Test 一式 scaffold |
| [api-new-service](./api-new-service/SKILL.md) | `/api-new-service <name>` | Service + Interface + DI バインディング追加 |
| [api-new-migration](./api-new-migration/SKILL.md) | `/api-new-migration <description>` | 命名規則に沿ったマイグレーション |
| [api-review](./api-review/SKILL.md) | `/api-review <path>` | バックエンドセルフレビュー |

**正典**: `docs/06_backend_design.md`

## 標準ワークフロー

### 新機能実装 (full stack)
```
1. /api-new-resource <name>        → Interface + Repository + Service + Controller 一式
2. /api-review backend/app/...     → バックエンドセルフレビュー
3. /ui-new-feature <name>          → Frontend feature scaffold
4. /ui-new-component <f> <comp>    → UI コンポーネント追加
5. /ui-new-page <path>             → ページ追加
6. /ui-review frontend/src/...     → フロントエンドセルフレビュー
```

### マイグレーションだけ追加
```
/api-new-migration add_xxx_to_yyy
```

### 差し替え可能な Service 追加 (AI プロバイダ、スケジューラ等)
```
/api-new-service <name>
```

## skill 起動の判定

タスクを受けたときの判定フローは [WHEN-TO-USE.md](./WHEN-TO-USE.md) を参照。

**新規ファイル作成を伴うタスクは、skill 起動が必須**。CLAUDE.md にもこの原則が明記されている。

## Skill の更新ポリシー

- 設計書 (`docs/05_frontend_design.md`, `docs/06_backend_design.md`) が正典
- 設計書の更新があれば、対応する skill も同時に更新する
- skill の指示と設計書が矛盾した場合、**設計書を優先**
- 新しい共通パターンが出現したら、それを skill に吸収する
