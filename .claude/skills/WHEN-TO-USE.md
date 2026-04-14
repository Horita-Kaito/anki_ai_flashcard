# Skill 起動判定ガイド

このファイルは Claude Code (私) が新規タスクを受けた際、どの skill を起動すべきかを機械的に判定するためのフローチャート。

---

## Step 1: タスクの種類を分類

### A. 新規作成系
ユーザー指示に以下のキーワードが含まれる:
- 「作って」「追加して」「新しく」「scaffold」「生成」「セットアップ」
- 「〜を実装」「〜を準備」「〜を作る」

→ **Step 2 へ**

### B. レビュー系
ユーザー指示に以下のキーワードが含まれる:
- 「レビュー」「チェック」「確認」「見直し」「問題ないか」
- 「コミット前に」「PR 前に」

→ **Step 3 へ**

### C. 修正系 (既存コードの変更)
- 「修正」「変更」「直して」「調整」「バグ」「リファクタ」

→ **skill 原則不要** (ただしリファクタの規模が大きい場合は skill を参考にする)

### D. 調査系
- 「どうなってる」「調べて」「説明して」「教えて」

→ **skill 不要**

---

## Step 2: 新規作成系の判定

### バックエンド (backend/app/ 配下)

```
新規作成対象が
├── 新しいドメインリソース (テーブル + CRUD API 一式)
│     → /api-new-resource <name>
│
├── Service クラス単体 (既存リソース内の追加、差し替え可能な戦略)
│     → /api-new-service <name>
│
├── マイグレーションのみ
│     → /api-new-migration <description>
│
├── 単発のエンドポイント追加 (既存 Controller に action 追加)
│     → skill 不要、ただし docs/06_backend_design.md に従う
│
└── その他 (Middleware, Listener, Job, Command 等)
      → skill 不要、docs/06_backend_design.md の命名規則に従う
```

### フロントエンド (frontend/src/ 配下)

```
新規作成対象が
├── 新しい feature ディレクトリ (features/<new>/)
│     → /ui-new-feature <name>
│
├── コンポーネント (.tsx ファイル新規作成)
│     → /ui-new-component <feature> <name>
│
├── 新しいページルート (app/.../page.tsx)
│     → /ui-new-page <path>
│
├── 既存コンポーネントに機能追加
│     → skill 不要、docs/05_frontend_design.md に従う
│
└── 純粋なユーティリティ (shared/lib/ のヘルパー関数等)
      → skill 不要、命名規則のみ遵守
```

### フルスタック機能追加 (最頻パターン)
新しいドメイン機能 (例: 「デッキ機能を作って」) の場合、**以下の順で skill を連続起動**:

1. `/api-new-resource deck` — バックエンド一式
2. `/api-review backend/app/` — バックエンドセルフレビュー
3. `/ui-new-feature deck` — フロント feature scaffold
4. 必要なコンポーネントごとに `/ui-new-component deck <comp>`
5. `/ui-new-page decks` — 一覧ページ追加
6. `/ui-review frontend/src/features/deck/` — フロントセルフレビュー

---

## Step 3: レビュー系の判定

```
レビュー対象パスが
├── frontend/src/ 配下
│     → /ui-review <path>
│
├── backend/app/ 配下
│     → /api-review <path>
│
└── 両方 or ドキュメント/設定
      → 個別に skill を起動し、該当しない部分は手動で確認
```

---

## 判定例

### 例1: "deck feature 作って"
→ フルスタック機能追加と判断
→ `/api-new-resource deck` から開始

### 例2: "DeckListItem コンポーネント作って"
→ 新規コンポーネント追加
→ `/ui-new-component deck deck-list-item`

### 例3: "users テーブルに plan カラム追加して"
→ マイグレーション作成
→ `/api-new-migration add_plan_to_users`

### 例4: "このログインフォームのバリデーション修正して"
→ 既存ファイルの修正
→ skill 不要、直接編集

### 例5: "今日作ったバックエンドのコードレビューして"
→ バックエンドレビュー
→ `/api-review backend/app/`

### 例6: "AI プロバイダとして Claude を追加して"
→ Service + Interface の新規実装 (AiProviderInterface を implement する新クラス)
→ `/api-new-service anthropic-provider`

---

## 強制力について

- Claude Code は CLAUDE.md と WHEN-TO-USE.md を毎セッションで参照する
- 新規ファイル作成が発生する場合、**skill を起動せずに書き始めるのは設計ルール違反**
- ユーザーが「skill 使わずにやって」と明示した場合はそれに従う
- 判断に迷った場合は skill を起動する方を選ぶ (起動コストは低い)
