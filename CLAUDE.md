# Anki AI Flashcard - Project Context

## Overview
AI策問補助付きフラッシュカードアプリ。学習メモからAIがカード候補を生成し、ユーザーがレビュー・採用して間隔反復で復習するシステム。

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
├── frontend/          # Next.js App Router
├── backend/           # Laravel API
├── docker/            # Docker設定
├── docs/              # ドキュメント
│   ├── requirements.md
│   ├── 00_environment_setup.md
│   ├── 01_mvp_phases.md
│   ├── 02_er_diagram.md
│   ├── 03_api_specification.md
│   └── 04_cicd.md
├── docker-compose.yml
└── .env.example
```

## Key Design Decisions
- AI生成結果は自動保存しない。必ず人間がレビューして採用/却下する
- AIプロバイダは `AiProviderInterface` で抽象化し差し替え可能にする
- 復習スケジューラは `SchedulerInterface` → `Sm2Scheduler` で戦略パターン
- 全学習データは `user_id` に紐づけてデータ分離

## Development Commands
```bash
docker compose up -d                              # 起動
docker compose exec backend php artisan migrate   # マイグレーション
docker compose exec backend php artisan test      # バックエンドテスト
docker compose exec frontend npm test             # フロントエンドテスト
docker compose exec frontend npm run lint         # Lint
```

## Conventions
- Backend: PSR-12 (Laravel Pint), APIリソースクラス使用
- Frontend: Feature-Sliced 設計 (`src/app/`, `src/features/`, `src/entities/`, `src/widgets/`, `src/shared/`)
- Frontend 詳細ルール: `docs/05_frontend_design.md` を必ず参照
- API: RESTful, `/api/v1/` prefix, JSON responses
- Git: `feature/phase{N}-{name}` ブランチ命名

## UI 作成ワークフロー
新しい画面・機能を追加する際は `.claude/skills/` の skill を使用:
- `/ui-new-feature <name>` — feature ディレクトリ scaffold
- `/ui-new-component <feature> <name>` — コンポーネント追加
- `/ui-new-page <path>` — ページ追加
- `/ui-review <path>` — コミット前セルフレビュー

詳細は `.claude/skills/README.md` を参照。
