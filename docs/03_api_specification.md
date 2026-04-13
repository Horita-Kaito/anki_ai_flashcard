# API仕様書

## 共通仕様

### ベースURL
```
http://localhost:8000/api
```

### 認証
Laravel Sanctum (SPA認証 / Cookie-based)

初回アクセス時:
```
GET /sanctum/csrf-cookie
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
      "daily_new_limit": 20,
      "daily_review_limit": 100,
      "default_ai_provider": "openai",
      "default_ai_model": "gpt-4o-mini",
      "default_generation_count": 3
    }
  }
}
```

---

## 2. デッキ系 API

### GET /api/decks
デッキ一覧取得

**Query Parameters**:
- `per_page` (int, optional): 1ページあたり件数 (default: 20)
- `page` (int, optional): ページ番号

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Web開発",
      "description": "Web開発関連の知識",
      "default_domain_template_id": 1,
      "new_cards_limit": 20,
      "review_limit": null,
      "card_count": 45,
      "due_count": 12,
      "created_at": "2026-04-13T00:00:00Z",
      "updated_at": "2026-04-13T00:00:00Z"
    }
  ],
  "meta": { ... }
}
```

---

### POST /api/decks
デッキ作成

**Request Body**:
```json
{
  "name": "Web開発",
  "description": "Web開発関連の知識",
  "default_domain_template_id": 1,
  "new_cards_limit": 20,
  "review_limit": null
}
```

**Validation**:
- name: 必須, 最大255文字
- description: 任意, 最大1000文字
- default_domain_template_id: 任意, domain_templates.idに存在
- new_cards_limit: 任意, 整数, 1-100
- review_limit: 任意, 整数, 1-500

**Response 201**:
```json
{
  "data": {
    "id": 1,
    "name": "Web開発",
    "description": "Web開発関連の知識",
    "default_domain_template_id": 1,
    "new_cards_limit": 20,
    "review_limit": null,
    "card_count": 0,
    "due_count": 0,
    "created_at": "2026-04-13T00:00:00Z",
    "updated_at": "2026-04-13T00:00:00Z"
  }
}
```

---

### GET /api/decks/{id}
デッキ詳細取得

**Response 200**: 上記と同じデータ構造 + カード一覧を含める(オプション)

---

### PUT /api/decks/{id}
デッキ更新

**Request Body**: POST と同じ(部分更新可)

**Response 200**: 更新後のデッキデータ

---

### DELETE /api/decks/{id}
デッキ削除

**Response 204**: No Content

**注意**: デッキ内のカード・スケジュール・レビュー履歴も連動削除 (CASCADE)

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
      "source_note_seed_id": 1,
      "source_ai_candidate_id": 3,
      "tags": [
        { "id": 1, "name": "設計パターン" }
      ],
      "schedule": {
        "state": "review",
        "due_at": "2026-04-15T00:00:00Z",
        "interval_days": 7,
        "ease_factor": 2.5
      },
      "created_at": "2026-04-13T00:00:00Z",
      "updated_at": "2026-04-13T00:00:00Z"
    }
  ],
  "meta": { ... }
}
```

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
  "tag_ids": [1, 3]
}
```

**Validation**:
- deck_id: 必須, 自分のデッキに存在
- question: 必須, 最大2000文字
- answer: 必須, 最大2000文字
- explanation: 任意, 最大5000文字
- card_type: 必須, basic_qa/comparison/practical_case/cloze_like
- tag_ids: 任意, 配列, 各要素が自分のタグに存在

**Response 201**: カードデータ + 自動作成された card_schedule

---

### GET /api/cards/{id}
カード詳細取得

---

### PUT /api/cards/{id}
カード更新

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

---

## 5. AI候補系 API

### POST /api/note-seeds/{id}/generate-candidates
AI候補生成

**Request Body**:
```json
{
  "domain_template_id": 1,
  "count": 3,
  "preferred_card_types": ["basic_qa", "comparison"],
  "additional_instructions": null
}
```

**Validation**:
- domain_template_id: 任意(メモのテンプレートを優先、未設定時はこちらを使用)
- count: 任意, 整数, 1-10, default 3
- preferred_card_types: 任意, 配列
- additional_instructions: 任意, 最大1000文字

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
      "status": "pending",
      "provider": "openai",
      "model_name": "gpt-4o-mini",
      "created_at": "2026-04-13T00:00:00Z"
    }
  ]
}
```

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
  "explanation": "補足説明テキスト"
}
```

**注意**: question/answer は省略時に候補の値をそのまま使用

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
      "source_note_seed_id": 1,
      "source_ai_candidate_id": 1,
      "schedule": {
        "state": "new",
        "due_at": "2026-04-13T00:00:00Z",
        "interval_days": 0,
        "ease_factor": 2.50
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
  "tag_ids": [1]
}
```

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

**Request Body**: generate-candidates と同じ

---

## 6. 学習セッション系 API

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
    "updated_schedule": {
      "state": "review",
      "repetitions": 4,
      "interval_days": 18,
      "ease_factor": 2.50,
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

## 7. 分野テンプレート系 API

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

## 8. タグ系 API

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

## 9. ユーザー設定 API

### GET /api/settings
設定取得

### PUT /api/settings
設定更新

**Request Body**:
```json
{
  "daily_new_limit": 20,
  "daily_review_limit": 100,
  "default_domain_template_id": 1,
  "default_ai_provider": "openai",
  "default_ai_model": "gpt-4o-mini",
  "default_generation_count": 3
}
```
