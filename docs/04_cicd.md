# CI/CD 構成

## 概要

GitHub Actions をベースに、以下のパイプラインを構築する。

```
Push/PR → Lint → Test → Build → (Deploy)
```

---

## パイプライン構成図

```
┌─────────────────────────────────────────────────────────┐
│                    GitHub Actions                        │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Trigger    │  │   Trigger   │  │   Trigger   │     │
│  │  PR (any)    │  │ push main   │  │  手動実行   │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │             │
│         ▼                ▼                ▼             │
│  ┌──────────────────────────────────────────────┐       │
│  │              ci.yml (PR / push)               │       │
│  │                                               │       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐      │       │
│  │  │ Backend  │ │ Frontend │ │ Frontend │      │       │
│  │  │  Lint    │ │   Lint   │ │  Build   │      │       │
│  │  │ (Pint)   │ │ (ESLint) │ │  Check   │      │       │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘      │       │
│  │       │             │             │            │       │
│  │  ┌────▼─────┐ ┌────▼─────┐       │            │       │
│  │  │ Backend  │ │ Frontend │       │            │       │
│  │  │  Test    │ │  Test    │       │            │       │
│  │  │ (PHPUnit)│ │ (Vitest) │       │            │       │
│  │  └──────────┘ └──────────┘       │            │       │
│  └──────────────────────────────────────────────┘       │
│                                                         │
│                 push main のみ                           │
│                      │                                   │
│                      ▼                                   │
│  ┌──────────────────────────────────────────────┐       │
│  │            deploy.yml (本番デプロイ)           │       │
│  │                                               │       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐      │       │
│  │  │  Build   │→│  Push    │→│  Deploy  │      │       │
│  │  │  Images  │ │  to ECR/ │ │  to VPS/ │      │       │
│  │  │          │ │  GHCR    │ │  Cloud   │      │       │
│  │  └──────────┘ └──────────┘ └──────────┘      │       │
│  └──────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

---

## ワークフロー定義

### 1. CI ワークフロー (.github/workflows/ci.yml)

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # ============================================
  # Backend (Laravel)
  # ============================================
  backend-lint:
    name: Backend Lint
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: "8.3"
          extensions: mbstring, pdo_mysql

      - name: Cache Composer
        uses: actions/cache@v4
        with:
          path: backend/vendor
          key: composer-${{ hashFiles('backend/composer.lock') }}

      - name: Install dependencies
        run: composer install --no-interaction --prefer-dist

      - name: Run Pint (Lint)
        run: ./vendor/bin/pint --test

  backend-test:
    name: Backend Test
    runs-on: ubuntu-latest
    needs: backend-lint
    defaults:
      run:
        working-directory: backend
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: testing
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5
    env:
      DB_CONNECTION: mysql
      DB_HOST: 127.0.0.1
      DB_PORT: 3306
      DB_DATABASE: testing
      DB_USERNAME: root
      DB_PASSWORD: root
    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: "8.3"
          extensions: mbstring, pdo_mysql
          coverage: xdebug

      - name: Cache Composer
        uses: actions/cache@v4
        with:
          path: backend/vendor
          key: composer-${{ hashFiles('backend/composer.lock') }}

      - name: Install dependencies
        run: composer install --no-interaction --prefer-dist

      - name: Generate key
        run: php artisan key:generate --env=testing

      - name: Run migrations
        run: php artisan migrate --env=testing

      - name: Run tests
        run: php artisan test --coverage --min=60

  # ============================================
  # Frontend (Next.js)
  # ============================================
  frontend-lint:
    name: Frontend Lint
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run TypeScript check
        run: npx tsc --noEmit

  frontend-test:
    name: Frontend Test
    runs-on: ubuntu-latest
    needs: frontend-lint
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --coverage

  frontend-build:
    name: Frontend Build Check
    runs-on: ubuntu-latest
    needs: frontend-lint
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
```

---

### 2. Deploy ワークフロー (.github/workflows/deploy.yml)

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [] # CI workflow は別途 branch protection で強制
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      # === Option A: VPS (SSH + Docker Compose) ===
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd /var/www/anki-ai-flashcard
            git pull origin main
            docker compose -f docker-compose.prod.yml up -d --build
            docker compose exec -T backend php artisan migrate --force
            docker compose exec -T backend php artisan config:cache
            docker compose exec -T backend php artisan route:cache

      # === Option B: コンテナレジストリ + クラウド ===
      # - name: Login to GHCR
      #   uses: docker/login-action@v3
      #   with:
      #     registry: ghcr.io
      #     username: ${{ github.actor }}
      #     password: ${{ secrets.GITHUB_TOKEN }}
      #
      # - name: Build and push
      #   uses: docker/build-push-action@v5
      #   with:
      #     context: .
      #     push: true
      #     tags: ghcr.io/${{ github.repository }}:latest
```

---

## ブランチ戦略

```
main ─────────────────────────────────── 本番 (デプロイ対象)
  │
  └── develop ────────────────────────── 開発統合ブランチ
        │
        ├── feature/phase0-docker ────── 機能ブランチ
        ├── feature/phase1-deck-crud
        ├── feature/phase2-ai-generation
        └── fix/xxx
```

### ルール
- `main` への直接 push 禁止
- PR マージ時に CI パス必須 (Branch Protection)
- `develop` → `main` はリリース時にマージ
- 機能ブランチは `feature/phase{N}-{機能名}` の命名規則

---

## 環境変数管理

| 環境 | 管理方法 |
|------|----------|
| ローカル | `.env` ファイル (git管理外) |
| CI | GitHub Secrets |
| 本番 | サーバー上の `.env` or Secrets Manager |

### GitHub Secrets に登録する値

```
# CI用
DB_PASSWORD          # テスト用DB
OPENAI_API_KEY       # E2Eテスト用 (将来)

# デプロイ用
DEPLOY_HOST
DEPLOY_USER
DEPLOY_SSH_KEY
```

---

## 本番環境構成 (VPS想定)

```
VPS (Ubuntu)
├── Docker Compose (production)
│   ├── nginx (リバースプロキシ + SSL)
│   ├── frontend (Next.js standalone)
│   ├── backend (Laravel + PHP-FPM)
│   ├── mysql
│   ├── redis
│   └── queue-worker (Laravel Queue)
├── Certbot (Let's Encrypt SSL)
└── バックアップ (mysqldump cron)
```

### docker-compose.prod.yml の主な違い
- `APP_ENV=production`, `APP_DEBUG=false`
- Nginx で SSL終端
- Next.js は `standalone` モードでビルド
- Laravel は `config:cache`, `route:cache` 適用
- MySQL データはホストボリュームにマウント
- 自動バックアップ (cron + mysqldump)

---

## バックアップ方針

```bash
# /etc/cron.d/anki-backup
0 3 * * * root mysqldump -u root -p$DB_ROOT_PASSWORD anki_ai_flashcard | gzip > /backups/anki_$(date +\%Y\%m\%d).sql.gz
0 4 * * 0 root find /backups -name "*.sql.gz" -mtime +30 -delete
```

- 毎日3時にDBダンプ
- 30日以上前のバックアップは自動削除
- 将来的にはS3等のオブジェクトストレージへのアップロードも検討
