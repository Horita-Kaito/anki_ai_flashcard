# MCP サーバー設計

Tessera を MCP (Model Context Protocol) サーバーとして公開し、ユーザーが自分の Claude (Claude Code / Claude Desktop) などの MCP クライアントから「メモ捕捉 → カード候補 → レビュー採用 → 復習」のコアフローを操作できるようにする。

## 構成

- パッケージ: 公式 `laravel/mcp` (`^0.8`)
- エンドポイント: `POST /mcp` (Streamable HTTP)。`routes/ai.php` で登録
- サーバー定義: `app/Mcp/Servers/TesseraServer.php`
- ツール: `app/Mcp/Tools/*`(全ツールが既存 Service 経由で user_id スコープを通る)

## 認証 (デュアル方式)

`POST /mcp` は `auth:sanctum,api` のマルチガードで 2 種類の Bearer を受け付け、
さらに `EnsureMcpAbility` ミドルウェアが `tokenCan('mcp:use')` を要求する。

| 経路 | トークン | 取得方法 | 主なクライアント |
|------|---------|---------|----------------|
| Sanctum PAT | `['*']` or `['mcp:use']` | `POST /api/v1/tokens` (scope=full/mcp)、設定画面、`tessera login` | Claude Code、CLI、自作スクリプト |
| Passport OAuth | scope `mcp:use` | DCR + PKCE Authorization Code フロー (自動) | claude.ai / ChatGPT コネクタ |

### PAT (手動取得)

```bash
claude mcp add --transport http tessera https://<host>/mcp \
  --header "Authorization: Bearer <TOKEN>"
```

### OAuth (コネクタ向け、RFC 8414 + DCR + PKCE)

`Mcp::oauthRoutes()` (routes/ai.php) が以下を提供する:

- `GET /.well-known/oauth-protected-resource` / `oauth-authorization-server` — メタデータ
- `POST /oauth/register` — 動的クライアント登録。リダイレクト先は `config/mcp.php` の
  `redirect_domains` (env `MCP_REDIRECT_DOMAINS`、既定: claude.ai / claude.com / chatgpt.com /
  chat.openai.com / localhost) と `custom_schemes` (claude / cursor / vscode) で制限
- `GET|POST|DELETE /oauth/authorize`, `POST /oauth/token` — Passport 標準 (PKCE 必須の public client)

認可画面はバックエンド完結の最小 Blade (`/oauth/login` = `WebLoginController` + `resources/views/oauth/authorize.blade.php`。
SPA の `/login` と衝突しないよう /oauth 配下に置き、リバースプロキシは `/mcp` `/oauth` `/.well-known` を backend に振る)。
Passport の鍵は `passport:keys` で生成し **コミットしない** (`storage/*.key` は gitignore 済み、
本番/staging は `PASSPORT_PRIVATE_KEY` / `PASSPORT_PUBLIC_KEY` を env 注入)。

> User モデルは Sanctum の `HasApiTokens` のみを使用する。Passport の同名トレイトとは
> `$accessToken` プロパティの型が非互換で併用できないが、Passport の TokenGuard が
> モデルに要求するのは `withAccessToken()` だけで Sanctum 実装がそのまま互換する
> (詳細は `app/Models/User.php` のコメント)。

### トークンスコープ

- PAT `scope=mcp` (`['mcp:use']`) は REST API 全般で 403 (`abilities:api-access`)、MCP のみ利用可
- OAuth トークンは `mcp:use` スコープのみ発行され、REST API は呼べない (`api` ガードは /mcp にしか付いていない)
- claude.ai 実機接続には公開 HTTPS (staging) が必要。ローカル検証は curl + MCP Inspector まで

## ツール一覧

| ツール | 内容 | 委譲先サービス |
| --- | --- | --- |
| `capture_note` | 会話内容をメモ (NoteSeed) として保存 | `NoteSeedService` |
| `propose_card_candidates` | 外部 LLM 起案のカードドラフトを **pending 候補**として登録 | `ExternalCardProposalService` |
| `generate_card_candidates` | サーバー側 AI 生成を非同期ディスパッチ | `CardGenerationService` |
| `list_card_candidates` | メモの候補一覧 (status フィルタ可) | `NoteSeedService` + 候補 Repository |
| `adopt_card_candidate` | 候補を採用してカード化 (ユーザーの明示承認が前提) | `AiCardCandidateService` |
| `list_decks` | デッキ一覧 (階層パス付き) | `DeckService` |
| `list_due_cards` | 復習期限が来たカードの取得 | `ReviewSessionService` |
| `answer_review` | 復習結果 (again/hard/good/easy) の記録 | `ReviewSessionService` |

## 不変条件

- `propose_card_candidates` は必ず `ai_card_candidates` に `status=pending` / `provider='external'` / `ai_generation_log_id=null` で保存し、`cards` には一切書かない。採用は人間の明示承認を経た `adopt_card_candidate` のみ
- サーバーの instructions で「ユーザーが承認していない候補を adopt しない」「復習では回答前に answer を明かさない」をクライアント LLM に指示している

## レート制限

- `/mcp` ルート全体: `throttle:mcp` (60 req/min/user、`AppServiceProvider` で定義)
- AI 生成: 単一ルートのためミドルウェアでは絞れず、`GenerateCardCandidatesTool` 内で HTTP 側 `throttle:ai-generation` と**同一バケット** (`md5('ai-generation'.userId)`、60 req/hour) を手動消費する。失敗時は計上しない (HTTP 側の `after` コールバックと同方針)。月次トークン上限は `CardGenerationService::assertMonthlyTokenLimit` がそのまま効く

## CLI (`cli/`)

`tessera` コマンド (Node 20+, TypeScript)。`tessera login` (PAT 取得・`~/.config/tessera/config.json` に 0600 保存) /
`tessera capture` (メモ投入) / `tessera review` (ターミナル復習) / `tessera mcp`
(stdio↔Streamable HTTP ブリッジ。stdio しか話せない MCP クライアント向け)。詳細は `cli/README.md`。

## 運用上の注意

- `generate_card_candidates` はキューワーカーが動いていないと完了しない (結果は `list_card_candidates` でポーリング)
- 設定画面 (設定 > API トークン) で PAT の発行 (full / mcp スコープ)・一覧・失効が可能

## テスト

`backend/tests/Feature/Mcp/` に集約。`TesseraServer::actingAs($user)->tool(...)` ヘルパーでツール単位、HTTP レベルは認証テストのみ。auth / validation / 他ユーザー分離 / 不変条件 (`propose` 後に `cards` が 0 件) / レート制限を網羅する。
