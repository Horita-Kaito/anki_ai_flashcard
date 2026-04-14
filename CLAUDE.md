# Anki AI Flashcard - Project Context

## Overview
AI策問補助付きフラッシュカードアプリ。学習メモからAIがカード候補を生成し、ユーザーがレビュー・採用して間隔反復で復習するシステム。将来的に公式リリース・収益化を見据える。

## Tech Stack
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Laravel (PHP 8.3) + API構成
- **Database**: MySQL 8.0
- **Cache/Queue**: Redis
- **Auth**: Laravel Sanctum (SPA Cookie認証)
- **AI**: OpenAI / Anthropic / Google (差し替え可能な抽象化レイヤー)
- **Infrastructure**: Docker Compose (dev), VPS (prod)

## Project Structure
```
anki_ai_flashcard/
├── frontend/          # Next.js App Router (Feature-Sliced)
├── backend/           # Laravel API (Repository + Service + Interface/DI)
├── docker/            # Docker設定
├── docs/              # 設計ドキュメント
│   ├── requirements.md
│   ├── 00_environment_setup.md
│   ├── 01_mvp_phases.md
│   ├── 02_er_diagram.md
│   ├── 03_api_specification.md
│   ├── 04_cicd.md
│   ├── 05_frontend_design.md  ← フロント正典
│   ├── 06_backend_design.md   ← バック正典
│   └── 07_testing_strategy.md ← テスト正典
├── docker-compose.{yml,dev.yml,staging.yml,prod.yml}
└── .env.{dev,staging,prod}.example
```

## Key Design Decisions

### アーキテクチャ
- **Backend**: Repository パターン + Service レイヤー + Interface First + DI
  - Controller → Service Interface → Repository Interface の一方向依存
  - 全クラス `final`、constructor promotion
- **Frontend**: Feature-Sliced 設計
  - `app/` → `widgets/` → `features/` → `entities/` → `shared/` の一方向依存
  - feature 間の直接 import 禁止
- **AI プロバイダ**: `AiProviderInterface` で抽象化 (設定駆動で切替)
- **復習スケジューラ**: `SchedulerInterface` → `Sm2Scheduler` で戦略パターン

### セキュリティ / データ分離
- 全学習データは `user_id` に紐づけ、全クエリで `user_id` スコープ
- 認証系は `throttle:5,1`、AI生成は `throttle:10,60`
- AI生成結果は自動保存しない、必ず人間レビュー

### UI
- モバイル/PC 両対応 (どちらでもメモ入力→カード化が最速で完結)
- モバイル: ボトムタブバー、タップDnD、ボトムシート、44px タップターゲット
- PC: キーボードショートカット駆動、`Cmd+K` パレット、数字キー評価

## Development Commands
```bash
docker compose up -d                              # 起動
docker compose exec backend php artisan migrate   # マイグレーション
docker compose exec backend php artisan test      # バックエンドテスト
docker compose exec frontend npm test             # フロントエンドテスト
docker compose exec frontend npm run lint         # Lint
docker compose exec backend ./vendor/bin/pint     # PHP Lint
```

## Conventions

### Backend (`docs/06_backend_design.md`)
- PSR-12 (Laravel Pint)
- Interface First: 全 Repository/差し替え可能 Service に Interface
- Controller → Service → Repository の依存方向厳守
- 全クラス `final`、constructor promotion
- FormRequest + API Resource + Policy

### Frontend (`docs/05_frontend_design.md`)
- Feature-Sliced: `src/app/`, `src/features/`, `src/entities/`, `src/widgets/`, `src/shared/`
- TanStack Query (Server) / react-hook-form+zod (Form) / useState (Local UI)
- ファイル kebab-case、型/クラス PascalCase、hook `use*`、定数 SCREAMING_SNAKE

### API
- RESTful, `/api/v1/` prefix, JSON responses
- リクエスト/レスポンス仕様は `docs/03_api_specification.md`

### Git
- `feature/phase{N}-{name}` ブランチ命名
- main = 本番、develop = 開発統合

## UI / API 作成ワークフロー (**必須**)

**重要**: 以下の作業に該当する場合、**ファイルを書き始める前に対応する skill を必ず起動すること**。skill を起動せず直接ファイルを作成することは設計ルール違反とみなす。

### 判定フロー (新規作成タスクの場合)

| 作業内容 | 必須の skill |
|----------|-------------|
| `frontend/src/features/<new>/` を作る | `ui-new-feature` |
| `.tsx` コンポーネントファイルを新規作成 | `ui-new-component` |
| `frontend/src/app/<path>/page.tsx` を新規作成 | `ui-new-page` |
| バックエンドに新リソース + CRUD を追加 | `api-new-resource` |
| 新 Service クラスを作成 (特に差し替え可能なもの) | `api-new-service` |
| マイグレーションを新規作成 | `api-new-migration` |

### 判定フロー (レビュータスクの場合)

| 作業内容 | 必須の skill |
|----------|-------------|
| フロントエンドコードをコミット/PR前にレビュー | `ui-review` |
| バックエンドコードをコミット/PR前にレビュー | `api-review` |
| ユーザーから「レビューして」「チェックして」と指示 | 対象に応じて `ui-review` / `api-review` |

### skill を使わなくてよいケース
- 既存ファイルの小規模修正 (文言変更、スタイル微調整、ロジック変更)
- バグ修正 (ただし大規模リファクタは skill で行う)
- ドキュメント更新
- 設定ファイル (`.env`, `docker-compose.yml` 等) の変更

### 迷った時の原則
**「新規ファイルを作るなら skill を通す」** を基本方針とする。skill を起動するコストは低いが、ワークフローを無視したコードを後から直すコストは高い。

### skill 一覧 (詳細は `.claude/skills/README.md`)
- フロント: `ui-new-feature`, `ui-new-component`, `ui-new-page`, `ui-review`
- バック: `api-new-resource`, `api-new-service`, `api-new-migration`, `api-review`

## 重要な原則
- 設計書 (`docs/05_frontend_design.md`, `docs/06_backend_design.md`) が正典
- 設計書と skill が矛盾したら **設計書優先**
- Repository を経由しない Eloquent 直接アクセスは禁止 (Controller/Service 内)
- Feature 間 / Service 間の直接依存は Interface 経由のみ
