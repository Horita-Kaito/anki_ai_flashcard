# MCP サーバー設計

Tessera を MCP (Model Context Protocol) サーバーとして公開し、ユーザーが自分の Claude (Claude Code / Claude Desktop) などの MCP クライアントから「メモ捕捉 → カード候補 → レビュー採用 → 復習」のコアフローを操作できるようにする。

## 構成

- パッケージ: 公式 `laravel/mcp` (`^0.8`)
- エンドポイント: `POST /mcp` (Streamable HTTP)。`routes/ai.php` で登録
- サーバー定義: `app/Mcp/Servers/TesseraServer.php`
- ツール: `app/Mcp/Tools/*`(全ツールが既存 Service 経由で user_id スコープを通る)

## 認証

Phase 1 は Sanctum Personal Access Token (Bearer)。

1. `POST /api/v1/tokens`(email / password / device_name)でトークン発行
2. MCP クライアントに `Authorization: Bearer <token>` ヘッダーを設定

```bash
claude mcp add --transport http tessera https://<host>/mcp \
  --header "Authorization: Bearer <TOKEN>"
```

Phase 2 (未実装): claude.ai / ChatGPT コネクタ対応のための OAuth (`Mcp::oauthRoutes()` + Laravel Passport)、トークン abilities によるスコープ制限。

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

## 運用上の注意

- `generate_card_candidates` はキューワーカーが動いていないと完了しない (結果は `list_card_candidates` でポーリング)
- PAT は現状 abilities なしの全権限。公開リリース前にスコープ化を検討 (Phase 2)

## テスト

`backend/tests/Feature/Mcp/` に集約。`TesseraServer::actingAs($user)->tool(...)` ヘルパーでツール単位、HTTP レベルは認証テストのみ。auth / validation / 他ユーザー分離 / 不変条件 (`propose` 後に `cards` が 0 件) / レート制限を網羅する。
