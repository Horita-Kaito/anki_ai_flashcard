# GitHub Actions ワークフロー

## ワークフロー一覧

| ワークフロー | トリガー | 用途 |
|-------------|---------|------|
| `ci.yml` | PR / push (main, develop) | Lint, Test, Build チェック |
| `docker-build.yml` | push (main, develop) | Docker イメージをビルドして GHCR にpush |
| `deploy-staging.yml` | push (develop) / 手動 | ステージング環境へデプロイ |
| `deploy-production.yml` | push (main) / 手動 | 本番環境へデプロイ (DBバックアップ付き) |

## 初期セットアップ

### 1. GitHub Environments を作成

リポジトリの **Settings → Environments** で以下を作成:

- `staging`
- `production` (protection rule で required reviewers を推奨)

### 2. Secrets 登録

**Repository Secrets** (Settings → Secrets and variables → Actions):

デプロイ先の環境ごとに以下を設定:

#### Staging
- `STAGING_HOST` — サーバーのホスト名/IP
- `STAGING_USER` — SSHユーザー名
- `STAGING_SSH_KEY` — SSH秘密鍵
- `STAGING_PORT` — SSHポート (optional, default 22)
- `STAGING_APP_PATH` — サーバー上のアプリパス (例: `/var/www/anki-ai-flashcard`)

#### Production
- `PRODUCTION_HOST`
- `PRODUCTION_USER`
- `PRODUCTION_SSH_KEY`
- `PRODUCTION_PORT` (optional)
- `PRODUCTION_APP_PATH`

### 3. Variables 登録

**Repository Variables**:

- `STAGING_URL` — ステージングURL (例: `https://staging.example.com`)
- `PRODUCTION_URL` — 本番URL (例: `https://your-domain.com`)

### 4. Branch Protection ルール

**Settings → Branches → Add rule** で `main` と `develop` に以下を設定:

- Require pull request before merging
- Require status checks to pass
  - Required checks: `CI Success`
- Require conversation resolution before merging
- Include administrators (推奨)

### 5. GHCR (GitHub Container Registry) の有効化

`docker-build.yml` は `GITHUB_TOKEN` で GHCR に push します。追加設定は不要ですが、初回 push 後にパッケージの可視性を確認してください。

## デプロイフロー

```
develop branch
    │
    │ push
    ▼
[ci.yml] → [docker-build.yml] → [deploy-staging.yml]
                                        │
                                        │ 動作確認
                                        ▼
                                    develop → main PR
                                        │
                                        │ merge
                                        ▼
main branch
    │
    ▼
[ci.yml] → [docker-build.yml] → [deploy-production.yml]
                                   (DBバックアップ → デプロイ → ヘルスチェック)
```

## 手動デプロイ

GitHub UI から `Actions` → 対象ワークフロー → `Run workflow` で実行可能。

## ロールバック

1. GitHub の Actions 履歴から直前の成功コミットを特定
2. そのコミットハッシュに `git reset --hard` し、リモートへ強制push (または revert commit)
3. `deploy-production.yml` を手動実行
4. 必要に応じてサーバー上の `/backups/pre-deploy-*.sql.gz` からDB復元
