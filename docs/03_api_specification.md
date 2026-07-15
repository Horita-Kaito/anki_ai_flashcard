# API仕様書

## 共通仕様

### ベースURL
```
http://localhost:8000/api
```

### 認証
Laravel Sanctum を採用し、用途に応じて2系統を使い分ける。

| 用途 | 方式 | 認証情報 |
|------|------|---------|
| Web フロント (Next.js SPA) | Cookie / Session (stateful) | `POST /api/v1/login` → CSRF Cookie + Session Cookie |
| ネイティブアプリ / 外部クライアント | Bearer Token (Personal Access Token) | `POST /api/v1/tokens` → `Authorization: Bearer <token>` |

保護ルートのミドルウェアはどちらも `auth:sanctum` で共通。Sanctum が Cookie / Bearer を自動判別する。

**SPA Cookie の初回アクセス**:
```
GET /sanctum/csrf-cookie
```

**Bearer Token の付与例**:
```
Authorization: Bearer 1|abcdefg...
```

### 共通レスポンス形式

**成功時**:
```json
{
  "data": { ... }
}
```

**一覧取得(ページネーション)時**:
```json
{
  "data": [ ... ],
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 20,
    "total": 100
  }
}
```

**エラー時**:
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "field_name": ["エラーメッセージ"]
  }
}
```

### HTTPステータスコード

| コード | 用途 |
|--------|------|
| 200 | 成功(取得/更新) |
| 201 | 成功(作成) |
| 204 | 成功(削除) |
| 401 | 未認証 |
| 403 | 権限なし |
| 404 | リソースなし |
| 422 | バリデーションエラー |
| 500 | サーバーエラー |

---

## 1. 認証系 API

### POST /api/register
ユーザー登録

**Request Body**:
```json
{
  "name": "テストユーザー",
  "email": "test@example.com",
  "password": "password123",
  "password_confirmation": "password123"
}
```

**Response 201**:
```json
{
  "data": {
    "id": 1,
    "name": "テストユーザー",
    "email": "test@example.com",
    "created_at": "2026-04-13T00:00:00Z"
  }
}
```

**Validation**:
- name: 必須, 最大255文字
- email: 必須, メール形式, ユニーク
- password: 必須, 最小8文字, confirmed

---

### POST /api/login
ログイン

**Request Body**:
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**Response 200**:
```json
{
  "data": {
    "id": 1,
    "name": "テストユーザー",
    "email": "test@example.com"
  }
}
```

**Error 401**:
```json
{
  "message": "認証情報が正しくありません。"
}
```

---

### POST /api/logout
ログアウト

**Response 204**: (No Content)

---

### GET /api/me
認証ユーザー情報取得

**Response 200**:
```json
{
  "data": {
    "id": 1,
    "name": "テストユーザー",
    "email": "test@example.com",
    "settings": {
      "default_ai_provider": "openai",
      "default_ai_model": "gpt-4o-mini"
    }
  }
}
```

---

### POST /api/v1/tokens
ネイティブアプリ / 外部クライアント向けの Bearer Token 発行 (ゲスト可、`throttle:5,1`)。

**Request Body**:
```json
{
  "email": "test@example.com",
  "password": "password123",
  "device_name": "my-iphone",
  "scope": "full"
}
```

`scope` (任意、デフォルト `full`):

| scope | abilities | 用途 |
|-------|-----------|------|
| `full` | `["*"]` | REST API + MCP のフルアクセス (iOS / CLI) |
| `mcp` | `["mcp:use"]` | MCP 接続専用。REST API は 403 (`abilities:api-access` で遮断) |

**Response 201**:
```json
{
  "data": {
    "id": 1,
    "name": "テストユーザー",
    "email": "test@example.com"
  },
  "token": "1|abcdef0123456789..."
}
```

`token` は発行時のみ平文で返却される。クライアントは安全なストレージ (Keychain / Keystore 等) に保存し、以降のリクエストは `Authorization: Bearer <token>` で送信する。

**Error 401**: 認証情報が誤っている / ユーザーが存在しない
**Error 422**: `device_name` 未指定

---

### POST /api/v1/tokens/issue
認証済みユーザーがパスワード再入力なしで Token を発行する (設定画面用、`throttle:10,1`)。

**Request Body**:
```json
{
  "device_name": "claude-mcp",
  "scope": "mcp"
}
```

**Response 201**:
```json
{
  "data": { "id": 5, "name": "claude-mcp", "abilities": ["mcp:use"] },
  "token": "5|abcdef0123456789..."
}
```

---

### GET /api/v1/tokens
発行済み Token の一覧を取得 (自分のもののみ)。

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "my-iphone",
      "abilities": ["*"],
      "last_used_at": "2026-04-28T10:00:00Z",
      "created_at": "2026-04-28T09:00:00Z"
    }
  ]
}
```

---

### DELETE /api/v1/tokens/current
現在のリクエストに使われている Bearer Token を revoke する。Cookie 認証経由で呼ばれた場合は何もしない (Token が存在しない)。

**Response 204**: (No Content)

> ヒント: `POST /api/v1/logout` も Bearer Token 経由なら自分の Token を revoke する。ネイティブアプリは `/tokens/current` または `/logout` のどちらでもログアウト可能。

---

### DELETE /api/v1/tokens/{id}
ID 指定で自分の Token を revoke する (設定画面用)。他ユーザーの Token は 404。

**Response 204**: (No Content)
**Error 404**: 自分が所有していない / 存在しない Token

> 注: 認証必須グループ全体に `abilities:api-access` が適用されており、`mcp` スコープの Token (`["mcp:use"]`) は REST API 全般に 403 を返す。MCP エンドポイント (`POST /mcp`) のみ利用できる。

---

## 2. デッキ系 API

デッキは自己参照 (`parent_id`) で階層化される。API レスポンスは `path` (ルートから自身までのデッキ名配列) と `has_children` を含み、一覧は原則フラット (ネストせず) で `parent_id` + `display_order` を返す。階層の組み立てはフロント側で行う。

### GET /api/decks
デッキ一覧取得 (全件、階層構造は parent_id と display_order から組み立て)

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "parent_id": null,
      "name": "マーケティング",
      "description": null,
      "default_domain_template_id": 1,
      "display_order": 0,
      "path": ["マーケティング"],
      "has_children": true,
      "card_count": 3,
      "due_count": 0,
      "created_at": "2026-04-13T00:00:00Z",
      "updated_at": "2026-04-13T00:00:00Z"
    },
    {
      "id": 2,
      "parent_id": 1,
      "name": "PESOモデル",
      "description": null,
      "default_domain_template_id": null,
      "display_order": 0,
      "path": ["マーケティング", "PESOモデル"],
      "has_children": false,
      "card_count": 12,
      "due_count": 4,
      ...
    }
  ]
}
```

---

### POST /api/decks
デッキ作成

**Request Body**:
```json
{
  "name": "PESOモデル",
  "description": null,
  "parent_id": 1,
  "default_domain_template_id": null
}
```

**Validation**:
- name: 必須, 最大255文字
- description: 任意, 最大1000文字
- parent_id: 任意, decks.id (同一ユーザー所有) に存在
- default_domain_template_id: 任意, domain_templates.id に存在 (同一ユーザー)

**Response 201**: 作成されたデッキデータ (GET と同構造)

---

### GET /api/decks/{id}
デッキ詳細取得

**Response 200**: 上記と同じデータ構造。

---

### PUT /api/decks/{id}
デッキ更新 (部分更新可)

**Request Body**: POST と同じ + `parent_id` の変更可

**バリデーション**:
- parent_id に自身 / 自分の子孫を指定できない (循環防止、422)
- parent_id の所有者は同一ユーザーに限定 (422)

**Response 200**: 更新後のデッキデータ

---

### POST /api/decks/tree
階層 + 並び順の一括更新 (ドラッグ DnD 後の保存用)

**Request Body**:
```json
{
  "nodes": [
    {"id": 1, "parent_id": null, "display_order": 0},
    {"id": 2, "parent_id": 1,    "display_order": 0},
    {"id": 3, "parent_id": 1,    "display_order": 1}
  ]
}
```

**バリデーション**:
- 循環参照が含まれる場合は 422
- 自ユーザー所有外の id が含まれる場合は 422
- トランザクションで一括更新

**Response 204**: No Content

**補足**: 既存の `POST /api/decks/reorder` (display_order のみの一括更新) は廃止し、
本エンドポイントに統合する。

---

### DELETE /api/decks/{id}
デッキ削除

**Response 204**: No Content

**注意**:
- 子デッキが残っている場合は **409 Conflict** を返し削除を拒否する。
  先に子デッキを別デッキへ移動するか個別削除する必要がある。
- 配下のカード・スケジュール・レビュー履歴は CASCADE で連動削除する。

---

## 3. カード系 API

### GET /api/cards
カード一覧取得

**Query Parameters**:
- `deck_id` (int, optional): デッキで絞込
- `tag` (string, optional): タグで絞込
- `search` (string, optional): question/answerをキーワード検索
- `card_type` (string, optional): カード種別で絞込
- `is_suspended` (bool, optional): 一時停止フラグで絞込
- `per_page` (int, optional): default 20
- `page` (int, optional)

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "deck_id": 1,
      "deck_name": "Web開発",
      "question": "DIとは何か",
      "answer": "依存性注入。オブジェクトの依存を外部から渡す設計パターン。",
      "explanation": null,
      "card_type": "basic_qa",
      "is_suspended": false,
      "scheduler": "fsrs",
      "source_note_seed_id": 1,
      "source_ai_candidate_id": 3,
      "tags": [
        { "id": 1, "name": "設計パターン" }
      ],
      "schedule": {
        "state": "review",
        "due_at": "2026-04-15T00:00:00Z",
        "interval_days": 7,
        "ease_factor": null,
        "stability": 7.2,
        "difficulty": 5.3,
        "lapse_count": 0
      },
      "created_at": "2026-04-13T00:00:00Z",
      "updated_at": "2026-04-13T00:00:00Z"
    }
  ],
  "meta": { ... }
}
```

`scheduler` ごとに schedule の値の意味が変わる:
- `scheduler="sm2"` → `ease_factor` (1.3〜2.5) を使う、`stability`/`difficulty` は null
- `scheduler="fsrs"` → `stability` (日) と `difficulty` (1.0〜10.0) を使う、`ease_factor` は null

---

### POST /api/cards
カード手動作成

**Request Body**:
```json
{
  "deck_id": 1,
  "question": "DIとは何か",
  "answer": "依存性注入。オブジェクトの依存を外部から渡す設計パターン。",
  "explanation": "テスト容易性や拡張性が向上する。",
  "card_type": "basic_qa",
  "scheduler": "fsrs",
  "tag_ids": [1, 3]
}
```

**Validation**:
- deck_id: 必須, 自分のデッキに存在
- question: 必須, 最大2000文字
- answer: 必須, 最大2000文字
- explanation: 任意, 最大5000文字
- card_type: 必須, basic_qa/comparison/practical_case/cloze_like
- scheduler: 任意, "sm2" | "fsrs" (デフォルト "fsrs")
- tag_ids: 任意, 配列, 各要素が自分のタグに存在

**Response 201**: カードデータ + 自動作成された card_schedule

---

### GET /api/cards/{id}
カード詳細取得

---

### PUT /api/cards/{id}
カード更新

**Request Body** (一部抜粋):
```json
{
  "question": "...",
  "answer": "...",
  "scheduler": "sm2"
}
```

**注意**: `scheduler` を変更すると、card_schedule の学習進捗 (state, repetitions,
interval_days, ease_factor, stability, difficulty, lapse_count, archived_at) は
すべて初期化される (state=new、ease_factor=2.5、その他 0/null)。
SM-2 と FSRS は状態変数が互換でないため、進捗を引き継ぐ自動変換は提供しない。
UI 側で確認ダイアログを介してから送信する想定。

---

### DELETE /api/cards/{id}
カード削除 (schedule, reviews もCASCADE)

---

## 4. メモ(NoteSeed)系 API

### GET /api/note-seeds
メモ一覧取得

**Query Parameters**:
- `search` (string, optional): 本文キーワード検索
- `domain_template_id` (int, optional)
- `has_candidates` (bool, optional): AI候補あり/なし
- `per_page`, `page`

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "body": "DIは依存を外から渡すことで差し替えやすくなる",
      "domain_template_id": 1,
      "domain_template_name": "Web開発",
      "subdomain": "設計パターン",
      "learning_goal": "DIの基本概念を理解する",
      "note_context": null,
      "candidates_count": 3,
      "adopted_count": 2,
      "created_at": "2026-04-13T00:00:00Z",
      "updated_at": "2026-04-13T00:00:00Z"
    }
  ],
  "meta": { ... }
}
```

---

### POST /api/note-seeds
メモ作成

**Request Body**:
```json
{
  "body": "DIは依存を外から渡すことで差し替えやすくなる",
  "domain_template_id": 1,
  "subdomain": "設計パターン",
  "learning_goal": "DIの基本概念を理解する",
  "note_context": null
}
```

**Validation**:
- body: 必須, 最大5000文字, 空白のみ不可
- domain_template_id: 任意, 自分のテンプレートに存在
- subdomain: 任意, 最大255文字
- learning_goal: 任意, 最大1000文字
- note_context: 任意, 最大2000文字

**Response 201**: メモデータ

---

### GET /api/note-seeds/{id}

---

### PUT /api/note-seeds/{id}

---

### DELETE /api/note-seeds/{id}
メモを削除する。紐づく未採用の AI 候補は常に連動削除される (FK CASCADE)。

**Query Parameters**:

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| delete_cards | boolean | - | true の場合、このメモを出所とする採用済みカード (schedule / review 履歴含む) も削除する。省略時 false: カードは残り `source_note_seed_id` が null になる |

**Response 200**:
```json
{
  "data": { "deleted_cards_count": 3 }
}
```

---

## 5. チャット系 API

### GET /api/chats
チャット一覧取得。メモ化済みで削除されたチャットは含まれない。

---

### POST /api/chats/{id}/materialize-notes
チャット内容からメモを作成し、カード候補生成を開始する。

**Response 202**:
```json
{
  "data": {
    "notes": [{ "id": 1, "body": "...", "note_context": "チャットから作成" }],
    "dispatched": [{ "note_seed_id": 1, "log_id": 10, "status": "queued" }],
    "skipped": [],
    "failed": [],
    "chat_session_deleted": true,
    "batch": {
      "id": 1,
      "source_chat_session_title": "ETag の相談",
      "notes_count": 1,
      "dispatched_count": 1,
      "failed_count": 0,
      "status": "completed"
    }
  }
}
```

---

### GET /api/chat-cardization-batches
チャット由来カード化 batch の履歴一覧取得。`per_page` は最大20。

---

### GET /api/chat-cardization-batches/{id}
カード化 batch 詳細取得。紐づく `notes` を含めて返す。

---

## 6. AI候補系 API

### POST /api/note-seeds/{id}/generate-candidates
AI候補生成

**Request Body**:
```json
{
  "domain_template_id": 1,
  "preferred_card_types": ["basic_qa", "comparison"],
  "additional_instructions": null
}
```

**Validation**:
- domain_template_id: 任意(メモのテンプレートを優先、未設定時はこちらを使用)
- preferred_card_types: 任意, 配列
- additional_instructions: 任意, 最大1000文字

**生成枚数**:
- 枚数の上限は設けない。AI はメモ内の独立した知識点を網羅的に分解する。
- 短文メモ (〜500字) で 5〜10 枚、長文メモ (3000字以上) で 30〜60 枚程度を想定する。
- 利用上限は `system_settings.monthly_token_limit` の月次トークン量で制御する (管理画面 `/admin/system-settings` で管理者が設定)。

**Response 201**:
```json
{
  "data": {
    "note_seed_id": 1,
    "provider": "openai",
    "model_name": "gpt-4o-mini",
    "prompt_version": "v1.0",
    "candidates": [
      {
        "id": 1,
        "question": "DIとは何か",
        "answer": "依存性注入。依存をオブジェクト外部から渡す設計パターン。",
        "card_type": "basic_qa",
        "focus_type": "definition",
        "rationale": "メモの核心概念を定義として問う",
        "confidence": 0.92,
        "status": "pending"
      },
      {
        "id": 2,
        "question": "DIの主な利点は何か",
        "answer": "依存の差し替えが容易になり、テスト容易性と拡張性が向上する。",
        "card_type": "basic_qa",
        "focus_type": "purpose",
        "rationale": "メモで言及されている利点を問う",
        "confidence": 0.88,
        "status": "pending"
      },
      {
        "id": 3,
        "question": "DIを使わない場合と比べて、テスト時にどのような違いが生まれるか",
        "answer": "モックやスタブへの差し替えが容易になり、単体テストが書きやすくなる。",
        "card_type": "comparison",
        "focus_type": "comparison",
        "rationale": "DIの有無による実務上の違いを比較で問う",
        "confidence": 0.85,
        "status": "pending"
      }
    ]
  }
}
```

**Error 422** (AI生成失敗時):
```json
{
  "message": "AI候補の生成に失敗しました。",
  "errors": {
    "ai": ["レスポンスのパースに失敗しました。再試行してください。"]
  }
}
```

---

### GET /api/note-seeds/{id}/candidates
メモの候補一覧取得

**Query Parameters**:
- `status` (string, optional): pending/adopted/rejected

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "question": "DIとは何か",
      "answer": "...",
      "card_type": "basic_qa",
      "focus_type": "definition",
      "rationale": "...",
      "confidence": 0.92,
      "quality_warnings": ["answer_exposed_in_question"],
      "status": "pending",
      "provider": "openai",
      "model_name": "gpt-4o-mini",
      "created_at": "2026-04-13T00:00:00Z"
    }
  ]
}
```

`quality_warnings` は AI 候補の採用を禁止するものではなく、人間レビューで確認すべき点を示す。現在は `answer_exposed_in_question`、`answer_too_long`、`cloze_answer_mismatch` を返す。

---

### POST /api/ai-card-candidates/{id}/adopt
候補をカードとして採用

**Request Body**:
```json
{
  "deck_id": 1,
  "question": "DIとは何か（編集後）",
  "answer": "依存性注入。（編集後）",
  "tag_ids": [1],
  "explanation": "補足説明テキスト",
  "scheduler": "fsrs"
}
```

**注意**:
- question/answer は省略時に候補の値をそのまま使用
- `scheduler` は省略可 (デフォルト "fsrs")

**Response 201**:
```json
{
  "data": {
    "card": {
      "id": 10,
      "deck_id": 1,
      "question": "DIとは何か（編集後）",
      "answer": "依存性注入。（編集後）",
      "card_type": "basic_qa",
      "scheduler": "fsrs",
      "source_note_seed_id": 1,
      "source_ai_candidate_id": 1,
      "schedule": {
        "state": "new",
        "due_at": "2026-04-13T00:00:00Z",
        "interval_days": 0,
        "ease_factor": null,
        "stability": null,
        "difficulty": null
      }
    },
    "candidate": {
      "id": 1,
      "status": "adopted"
    }
  }
}
```

---

### POST /api/ai-card-candidates/batch-adopt
複数候補を一括採用

**Request Body**:
```json
{
  "deck_id": 1,
  "candidate_ids": [1, 2, 3],
  "tag_ids": [1],
  "scheduler": "fsrs"
}
```

**注意**: `scheduler` は省略可 (デフォルト "fsrs")。すべての採用カードに適用。

**Response 201**:
```json
{
  "data": {
    "adopted_count": 3,
    "cards": [ ... ]
  }
}
```

---

### PUT /api/ai-card-candidates/{id}
候補内容を編集 (採用前の修正)

**Request Body**:
```json
{
  "question": "修正後の問題文",
  "answer": "修正後の回答"
}
```

---

### DELETE /api/ai-card-candidates/{id}
候補を却下 (status を rejected に更新)

**Response 200**:
```json
{
  "data": {
    "id": 1,
    "status": "rejected"
  }
}
```

---

### POST /api/note-seeds/{id}/regenerate-candidates
候補の再生成

既存の pending 候補を rejected にし、新たに生成。
プロンプトには全既存候補 (却下済み含む) の question が「同じ切り口を避ける」指示と共に渡される。

**Request Body**: generate-candidates と同じ + 以下

| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| feedback | string (max 500) | - | 「何が気に入らなかったか」の修正指示。プロンプトに最優先指示として注入される |

---

## 7. 学習セッション系 API

### GET /api/review-sessions/today
今日の復習対象カード取得

**Query Parameters**:
- `deck_id` (int, optional): デッキ絞込
- `limit` (int, optional): 取得件数上限

**Response 200**:
```json
{
  "data": {
    "total_due": 15,
    "new_count": 5,
    "review_count": 10,
    "cards": [
      {
        "id": 1,
        "deck_id": 1,
        "deck_name": "Web開発",
        "question": "DIとは何か",
        "answer": "依存性注入。",
        "explanation": null,
        "card_type": "basic_qa",
        "tags": [{ "id": 1, "name": "設計パターン" }],
        "schedule": {
          "state": "review",
          "repetitions": 3,
          "interval_days": 7,
          "ease_factor": 2.50,
          "lapse_count": 0
        }
      }
    ]
  }
}
```

---

### POST /api/review-sessions/answer
回答評価を送信

**Request Body**:
```json
{
  "card_id": 1,
  "rating": "good",
  "response_time_ms": 5200
}
```

**Validation**:
- card_id: 必須, 自分のカードに存在
- rating: 必須, again/hard/good/easy
- response_time_ms: 任意, 整数

**Response 200**:
```json
{
  "data": {
    "card_id": 1,
    "rating": "good",
    "scheduler": "fsrs",
    "updated_schedule": {
      "state": "review",
      "repetitions": 4,
      "interval_days": 18,
      "ease_factor": null,
      "stability": 18.4,
      "difficulty": 5.2,
      "due_at": "2026-05-01T00:00:00Z",
      "lapse_count": 0
    },
    "session_progress": {
      "completed": 8,
      "remaining": 7,
      "total": 15
    }
  }
}
```

`scheduler` ごとに `updated_schedule` の値の意味が変わる:
- `scheduler="sm2"` → `ease_factor` を返し、`stability`/`difficulty` は null
- `scheduler="fsrs"` → `stability`/`difficulty` を返し、`ease_factor` は null

---

### GET /api/review-stats
学習統計取得

**Query Parameters**:
- `deck_id` (int, optional)
- `period` (string, optional): today/week/month/all (default: today)

**Response 200**:
```json
{
  "data": {
    "today": {
      "due_count": 15,
      "completed_count": 8,
      "again_count": 2,
      "hard_count": 1,
      "good_count": 4,
      "easy_count": 1
    },
    "overall": {
      "total_cards": 120,
      "total_reviews": 850,
      "again_rate": 0.12,
      "average_ease_factor": 2.45
    },
    "by_deck": [
      {
        "deck_id": 1,
        "deck_name": "Web開発",
        "card_count": 45,
        "review_count": 320,
        "due_today": 8
      }
    ]
  }
}
```

---

## 8. 分野テンプレート系 API

### GET /api/domain-templates
テンプレート一覧取得

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Web開発",
      "description": "Web開発関連の策問テンプレート",
      "instruction_json": {
        "goal": "Web開発の基礎知識を定着させる",
        "priorities": ["定義を短く問う", "なぜ必要かを問う"],
        "avoid": ["長文回答を求める問い"],
        "preferred_card_types": ["basic_qa", "comparison"],
        "answer_style": "1-2文で簡潔に",
        "difficulty_policy": "初学者向け",
        "note_interpretation_policy": "メモにない内容を過剰に補完しない"
      },
      "created_at": "2026-04-13T00:00:00Z",
      "updated_at": "2026-04-13T00:00:00Z"
    }
  ]
}
```

---

### POST /api/domain-templates
テンプレート作成

**Request Body**:
```json
{
  "name": "Web開発",
  "description": "Web開発関連の策問テンプレート",
  "instruction_json": {
    "goal": "...",
    "priorities": ["..."],
    "avoid": ["..."],
    "preferred_card_types": ["basic_qa"],
    "answer_style": "...",
    "difficulty_policy": "...",
    "note_interpretation_policy": "..."
  }
}
```

**Validation**:
- name: 必須, 最大255文字
- description: 任意, 最大1000文字
- instruction_json: 必須, JSONオブジェクト
- instruction_json.goal: 必須, 文字列
- instruction_json.priorities: 必須, 文字列配列

---

### GET /api/domain-templates/{id}

### PUT /api/domain-templates/{id}

### DELETE /api/domain-templates/{id}

---

## 9. タグ系 API

### GET /api/tags
タグ一覧取得 (全タグ、ページネーションなし)

**Response 200**:
```json
{
  "data": [
    { "id": 1, "name": "設計パターン", "card_count": 12 },
    { "id": 2, "name": "JavaScript", "card_count": 28 }
  ]
}
```

---

### POST /api/tags
タグ作成

**Request Body**:
```json
{
  "name": "設計パターン"
}
```

---

## 10. ユーザー設定 API

### GET /api/settings
設定取得

### PUT /api/settings
設定更新

**Request Body**:
```json
{
  "default_domain_template_id": 1,
  "default_ai_provider": "openai",
  "default_ai_model": "gpt-4o-mini",
  "desired_retention": 0.9
}
```

**Validation**:
- `default_ai_provider` (任意): `openai` / `google`。
- `default_ai_model` (任意): 選択可能モデルのみ。不整合な旧設定や provider の部分更新は provider の既定モデルへ補正する。
- `desired_retention` (任意): FSRS の目標想起率。0.7〜0.97 (デフォルト 0.9)。
  低いほど復習頻度が下がるが忘却率が上がる、高いほど確実だが復習量が増える。
  SM-2 カードには影響しない。

**補足**:
- 旧 `daily_new_limit` / `daily_review_limit` は廃止。復習対象は due なカードを制限なく返す。
- 旧 `default_generation_count` は廃止。AI 候補生成はメモから網羅的に生成し、利用上限は `system_settings.monthly_token_limit` (管理画面で管理者が設定) で制御する。

---

## 11. 管理者専用 API

`can:access-admin` ゲート (`config('admin.emails')` に含まれる email のみ) を通過する必要がある。
未認証は 401、認証済みでも管理者でなければ 403。

### POST /api/admin/users
管理者が新規ユーザーを発行する (パスワードはランダム生成され、レスポンスでのみ 1 度返る)。`throttle:10,60`。

### GET /api/admin/system-settings
全ユーザー共通のシステム設定を取得する。

**Response 200**:
```json
{
  "data": {
    "monthly_token_limit": 500000,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

- `monthly_token_limit`: 月次トークン上限 (input+output 合計)。`null` は無制限。

### PUT /api/admin/system-settings
システム設定を更新する。

**Request Body**:
```json
{ "monthly_token_limit": 500000 }
```

または無制限に戻す場合:
```json
{ "monthly_token_limit": null }
```

**Validation**:
- `monthly_token_limit`: `nullable | integer | min:1000 | max:1000000000`

---

## 12. ダッシュボード API

### GET /api/v1/dashboard/summary
ログインユーザーのダッシュボード用サマリを返す。すべて `user_id` でスコープされる。

**Response (200)**:
```json
{
  "data": {
    "due_count_today": 15,
    "new_cards_count": 4,
    "total_cards": 120,
    "total_pending_candidates": 7,
    "recent_notes": [{ "id": 1, "body": "...", "created_at": "..." }],
    "recent_cards": [{ "id": 1, "question": "...", "created_at": "..." }],
    "ai_usage": { "today_calls": 2, "month_calls": 30, "month_cost_usd": 0.12 },
    "streak": { "current": 3, "longest": 10, "today_done": true }
  }
}
```

**フィールド補足**:
- `total_pending_candidates`: そのユーザーの全メモ横断の未レビュー (status=pending) AI 候補総数 (int)。

---

## 13. 端末間同期 API

### POST /api/v1/sync
iOS (SwiftData) と Backend 間のオプトイン差分同期。1 リクエストで push (クライアント変更の取り込み) と pull (`since` 以降のサーバ変更の返却) を同時に行う。

**認証**: 必須 (`auth:sanctum`)。すべて `user_id` スコープ。
**Rate limit**: `throttle:sync` = **10 req/min/user**。
**上限**: 1 リクエスト・1 エンティティあたり push **最大 500 件** (超過は 422)。pull も 1 エンティティ最大 500 件で、超過分は次回同期のカーソルで取得。

**同期キー**: `(user_id, client_id)`。`client_id` は iOS が発番する UUID。

**対象エンティティ (push/pull とも依存順 親→子)**:
`decks` → `note_seeds` → `ai_card_candidates` → `cards` → `card_schedules`

**Request Body**:
```json
{
  "since": "1717200000000",
  "changes": {
    "decks": [
      {
        "client_id": "1f3b...uuid",
        "name": "デッキA",
        "description": null,
        "display_order": 0,
        "parent_client_id": "0a2c...uuid",
        "updated_at": "2026-06-10T12:34:56Z",
        "deleted": false
      }
    ],
    "cards": [
      {
        "client_id": "...",
        "deck_client_id": "1f3b...uuid",
        "source_note_seed_client_id": null,
        "source_ai_candidate_client_id": null,
        "question": "...",
        "answer": "...",
        "updated_at": "2026-06-10T12:34:56.123Z"
      }
    ]
  }
}
```

**フィールド規約**:
- `since`: 前回レスポンスの `cursor` 文字列 (epoch ミリ秒の十進文字列)。初回は `null`。
- `changes.{entity}`: 各最大 500 件。
- `client_id`: 必須・最大 36 文字。
- `updated_at`: ISO 8601 **UTC のみ** (`Z` または `+00:00`)。秒精度 (`2026-06-10T12:34:56Z`) と fractional seconds 付き (`...56.123Z`) の両方を許可。ローカルオフセット (例 `+09:00`) や非 ISO 形式は 422。
- `deleted`: 省略時 false。`true` で削除を表す。
- 参照は `{relation}_client_id` (例 `deck_client_id`, `note_seed_client_id`) で送る。サーバ側で同一ユーザーの `client_id` から FK へ解決する。

**競合解決 (Last-Write-Wins)**:
- 更新・削除いずれも `updated_at` (クライアント論理時刻) を比較し、既存行/削除墓標の論理時刻より**新しい場合のみ**適用する。古い更新・古い削除は無視。
- 削除後により新しい更新 (再作成) を受けると行は復活し、削除墓標は取り消される。
- クライアント時計がサーバ現在時刻 +5 分を超える未来の `updated_at` は、LWW 乗っ取り防止のためサーバ現在時刻にクランプする。

**削除の扱い**:
- 削除は SoftDelete ではなく物理削除 + `sync_tombstones` への墓標記録で表現 (既存 Web の物理削除/FK カスケードを温存)。
- pull では墓標を該当エンティティ配列に `{ "client_id", "deleted": true, "updated_at" }` として配信する。

**デッキ階層 (`parent_client_id`)**:
- push: `parent_client_id` を同一ユーザーの decks から `client_id` で検索し `parent_id` に解決。見つからない場合は null。同一バッチ内で親が後から来ても解決できるよう、全件 upsert 後に親解決の second pass を行う。自己参照・直接循環は拒否し null にフォールバック。
- pull: 各 deck の `parent_id` を親の `client_id` に変換して `parent_client_id` として返す (親なしは null)。

**Response (200)**:
```json
{
  "data": {
    "cursor": "1717286400123",
    "changes": {
      "decks": [
        {
          "client_id": "1f3b...uuid",
          "name": "デッキA",
          "description": null,
          "display_order": 0,
          "parent_client_id": null,
          "updated_at": "2026-06-10T12:34:56+00:00",
          "deleted": false
        }
      ],
      "note_seeds": [],
      "ai_card_candidates": [],
      "cards": [],
      "card_schedules": []
    }
  }
}
```

- `cursor`: 次回 `since` に渡す。サーバ `updated_at` の最大値 (epoch ミリ秒文字列)。
- pull のカーソルはサーバ壁時計ベースで、LWW の `updated_at` とは別軸 (クロックスキュー回避)。

**既知の制限 (v1)**: Web 側で行を削除しても墓標は作られないため、その削除は iOS へ伝播しない (iOS 発の削除は明示送信されるため iOS↔iOS は完全伝播)。
