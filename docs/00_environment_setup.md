# 環境構築ガイド

## 前提条件

- Docker Desktop (v4.x+)
- Docker Compose (v2.x+)
- Node.js 20+ (ローカル開発用)
- PHP 8.3+ (ローカル開発用、Docker内で完結も可)
- Composer 2.x
- Git

---

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────┐
│                  Docker Compose                  │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ frontend │  │ backend  │  │  mysql    │       │
│  │ Next.js  │  │ Laravel  │  │  8.0     │       │
│  │ :3000    │  │ :8000    │  │  :3306   │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │              │              │             │
│       │         API呼出          DB接続           │
│       └──────────┘              │             │
│                  └──────────────┘             │
│                                                  │
│  ┌──────────┐  ┌──────────┐                      │
│  │ mailpit  │  │  redis   │                      │
│  │  :8025   │  │  :6379   │                      │
│  └──────────┘  └──────────┘                      │
└─────────────────────────────────────────────────┘
```

---

## ディレクトリ構成

```
anki_ai_flashcard/
├── docker-compose.yml
├── .env.example
├── CLAUDE.md
├── docs/
│   ├── requirements.md
│   ├── 00_environment_setup.md
│   ├── 01_mvp_phases.md
│   ├── 02_er_diagram.md
│   ├── 03_api_specification.md
│   └── 04_cicd.md
├── frontend/                    # Next.js (App Router)
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── dashboard/
│   │   │   ├── decks/
│   │   │   ├── cards/
│   │   │   ├── notes/
│   │   │   ├── review/
│   │   │   ├── templates/
│   │   │   ├── stats/
│   │   │   └── settings/
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui
│   │   │   ├── layout/
│   │   │   ├── cards/
│   │   │   ├── review/
│   │   │   └── ai/
│   │   ├── lib/
│   │   │   ├── api.ts           # APIクライアント
│   │   │   ├── auth.ts
│   │   │   └── utils.ts
│   │   ├── hooks/
│   │   └── types/
│   └── public/
├── backend/                     # Laravel
│   ├── Dockerfile
│   ├── composer.json
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── Auth/
│   │   │   │   ├── DeckController.php
│   │   │   │   ├── CardController.php
│   │   │   │   ├── NoteSeedController.php
│   │   │   │   ├── AiCandidateController.php
│   │   │   │   ├── ReviewSessionController.php
│   │   │   │   ├── DomainTemplateController.php
│   │   │   │   └── UserSettingController.php
│   │   │   ├── Requests/
│   │   │   └── Resources/
│   │   ├── Models/
│   │   ├── Services/
│   │   │   ├── AI/
│   │   │   │   ├── AiProviderInterface.php
│   │   │   │   ├── OpenAiProvider.php
│   │   │   │   ├── AnthropicProvider.php
│   │   │   │   └── CardGenerationService.php
│   │   │   └── Review/
│   │   │       ├── SchedulerInterface.php
│   │   │       └── Sm2Scheduler.php
│   │   └── Policies/
│   ├── database/
│   │   ├── migrations/
│   │   ├── seeders/
│   │   └── factories/
│   ├── routes/
│   │   └── api.php
│   └── tests/
│       ├── Unit/
│       └── Feature/
└── docker/
    ├── nginx/
    │   └── default.conf
    ├── php/
    │   └── Dockerfile
    └── mysql/
        └── init.sql
```

---

## セットアップ手順

### 1. リポジトリクローン & 環境変数設定

```bash
git clone <repository-url> anki_ai_flashcard
cd anki_ai_flashcard
cp .env.example .env
```

### 2. Docker起動

```bash
# 開発環境 (推奨: .env に COMPOSE_FILE を設定済みならこれだけでOK)
docker compose up -d --build

# 明示的に指定する場合
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

# ステージング
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d --build

# 本番
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### 3. バックエンド初期設定

```bash
# Composerインストール
docker compose exec backend composer install

# アプリケーションキー生成
docker compose exec backend php artisan key:generate

# マイグレーション実行
docker compose exec backend php artisan migrate

# シーダー実行（初期データ）
docker compose exec backend php artisan db:seed
```

### 4. フロントエンド初期設定

```bash
# 依存パッケージインストール
docker compose exec frontend npm install

# shadcn/ui初期化（初回のみ）
docker compose exec frontend npx shadcn@latest init
```

### 5. 動作確認

| サービス | URL |
|----------|-----|
| フロントエンド | http://localhost:3000 |
| バックエンドAPI | http://localhost:8000/api |
| Mailpit (メール確認) | http://localhost:8025 |

---

## 環境変数一覧 (.env)

```env
# === App ===
APP_NAME=AnkiAiFlashcard
APP_ENV=local
APP_DEBUG=true

# === Database ===
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=anki_ai_flashcard
DB_USERNAME=app_user
DB_PASSWORD=app_password
DB_ROOT_PASSWORD=root_password

# === Frontend ===
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# === AI Providers ===
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
DEFAULT_AI_PROVIDER=openai
DEFAULT_AI_MODEL=gpt-4o-mini

# === Laravel ===
APP_KEY=
SANCTUM_STATEFUL_DOMAINS=localhost:3000
SESSION_DOMAIN=localhost
CORS_ALLOWED_ORIGINS=http://localhost:3000

# === Redis ===
REDIS_HOST=redis
REDIS_PORT=6379

# === Queue ===
QUEUE_CONNECTION=redis
```

---

## 認証方式

初期フェーズでは **Laravel Sanctum (SPA認証)** を採用する。

- フロントエンド (Next.js) とバックエンド (Laravel) が同一ドメインまたはCORS設定済みの前提
- Cookie ベースのセッション認証で、トークン管理不要
- CSRFトークンの自動ハンドリング
- 個人利用ではシンプルかつ安全

### 認証フロー
1. `GET /sanctum/csrf-cookie` でCSRFトークン取得
2. `POST /api/login` でログイン（セッション開始）
3. 以降のリクエストはCookieで自動認証
4. `POST /api/logout` でログアウト

---

## 開発コマンド集

```bash
# コンテナ起動/停止
docker compose up -d
docker compose down

# ログ確認
docker compose logs -f backend
docker compose logs -f frontend

# バックエンドシェル
docker compose exec backend bash

# マイグレーション
docker compose exec backend php artisan migrate
docker compose exec backend php artisan migrate:rollback

# テスト実行
docker compose exec backend php artisan test
docker compose exec frontend npm test

# Lint
docker compose exec frontend npm run lint
docker compose exec backend ./vendor/bin/pint

# キュー処理（AI生成で使用）
docker compose exec backend php artisan queue:work
```
