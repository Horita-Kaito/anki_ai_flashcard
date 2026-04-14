---
name: api-review
description: |
  **必ず使用する条件**: backend/app/ 配下のコード (Controller, Service, Repository, Model, Migration, Request, Resource, Policy 等) を新規作成または大規模修正した後、コミット/PR 前に必ずこの skill を起動してセルフレビューする。ユーザーが「レビューして」「チェックして」「コミット前に確認」等とバックエンドに対して指示した場合も起動する。
  やること: 14 観点 (レイヤー依存、Interface First、命名、コード品質、バリデーション、認可、レスポンス、セキュリティ、例外処理、パフォーマンス、テスト、マイグレーション、AI 連携、収益化) で設計ルール違反を検出し、Critical/Recommended に分類して報告する。
  使わない場合: フロントエンドコードのレビューは ui-review を使う。
  必ず docs/06_backend_design.md に従うこと。
---

# API Review Skill

作成したバックエンドコードを厳格にセルフレビューする。

## 前提ドキュメント
- `docs/06_backend_design.md` (全章)

## 引数
`<path>` — ファイルまたはディレクトリのパス。例: `backend/app/Services/DeckService.php`, `backend/app/`。

## レビュー観点

### 1. レイヤー依存
- [ ] Controller → Service Interface → Repository Interface の依存方向を守っている
- [ ] Controller に Eloquent クエリがない
- [ ] Service に Eloquent クエリがない (Repository 経由で呼ぶ)
- [ ] Service が具象クラスを `new` していない (DI で受け取る)
- [ ] Repository が HTTP (Request/Response) に依存していない
- [ ] Model がビジネスロジックを持っていない (Scope や Accessor 程度まで)

### 2. Interface First
- [ ] Repository に Interface が用意されている (`app/Contracts/Repositories/`)
- [ ] 差し替え可能な Service に Interface がある (AI, スケジューラ等)
- [ ] Interface と具象の命名が `XxxInterface` / `XxxService` (`EloquentXxxRepository`)
- [ ] Service Provider で Interface → 具象のバインディングが登録されている

### 3. 命名規則
- [ ] クラス名が PascalCase
- [ ] メソッド名が camelCase、ユースケース寄り (findById ではなく findForUser)
- [ ] 変数名が snake_case
- [ ] Boolean カラム/属性が `is_*` / `has_*`
- [ ] 日時カラムが `*_at`
- [ ] Controller アクション名が REST 規約 (index/show/store/update/destroy)

### 4. コード品質
- [ ] クラスが `final` (Model, Request を除く)
- [ ] constructor property promotion を使っている (`private readonly`)
- [ ] メソッドの引数・戻り値に型宣言がある
- [ ] 配列の要素型を PHPDoc で明示 (`array<string, mixed>`, `array<int, Deck>`)
- [ ] 1 クラス 1 責務 (大きくなったら分割)

### 5. バリデーション
- [ ] POST/PUT/PATCH で FormRequest を使っている
- [ ] `authorize()` で認可 or middleware で担保
- [ ] `exists:` ルールが `user_id` スコープ付き (他ユーザー参照防止)
- [ ] エラーメッセージが日本語で具体的

### 6. 認可 (Policy)
- [ ] Policy が定義されている
- [ ] Controller で `$this->authorize(...)` を呼んでいる
- [ ] 全リソースアクセスで `user_id` が検証されている
- [ ] 他ユーザーのリソースへのアクセスで 403/404 が返る

### 7. レスポンス
- [ ] API Resource を使っている (生の Model を返していない)
- [ ] 日時が ISO 8601 形式
- [ ] ページネーションメタ情報が含まれる (一覧APIの場合)
- [ ] エラーレスポンスが統一形式 (`message`, `errors`)

### 8. セキュリティ
- [ ] Rate Limiting (`throttle:`) が設定されている
  - 認証系: `throttle:5,1`
  - AI 生成系: `throttle:10,60`
  - 一般: デフォルト (`throttleApi()`)
- [ ] Model に `$fillable` が定義されている (Mass Assignment 対策)
- [ ] パスワードは `Hash::make()` or `bcrypt()`
- [ ] LIKE 検索でユーザー入力の `%` / `_` がエスケープされている
- [ ] `User::$hidden` で機密フィールドを除外
- [ ] AI の生レスポンスをそのまま返していない

### 9. 例外処理
- [ ] ドメイン例外クラスが定義されている (`DeckNotFoundException` 等)
- [ ] Handler で HTTP レスポンスに変換する登録がある
- [ ] Service で domain exception を throw、Controller で HTTP exception に変換

### 10. パフォーマンス
- [ ] N+1 がない (`with()` で eager loading)
- [ ] DB 設計書通りのインデックスが張られている
- [ ] 重い集計処理が同期で走っていない (Queue に投げる)
- [ ] `select *` を使っていない (必要カラムのみ)

### 11. テスト
- [ ] Feature Test が書かれている (Controller レベル)
- [ ] Unit Test が書かれている (Service の重要ロジック)
- [ ] 認可エラーのテストがある (403)
- [ ] バリデーションエラーのテストがある (422)
- [ ] 他ユーザーのリソースにアクセスできないテストがある
- [ ] モックで Interface を差し替えている (具象テストは最低限)

### 12. マイグレーション (該当時)
- [ ] `foreignId('user_id')->constrained()->cascadeOnDelete()` がある
- [ ] 主要クエリパターンのインデックスが張られている
- [ ] `down()` が実装されている
- [ ] FK の ON DELETE 動作が明示されている

### 13. AI 連携 (該当時)
- [ ] `AiProviderInterface` 経由で呼び出している
- [ ] タイムアウト・リトライが実装されている
- [ ] JSON 破損時のフォールバックがある
- [ ] プロバイダのエラーメッセージをそのままクライアントに返していない
- [ ] 生成ログ (provider, model, prompt_version, duration) が保存される

### 14. 収益化準備
- [ ] プラン制限が必要な箇所でガードが入っている (or 将来差し込み可能)
- [ ] 使用量をトラッキングする箇所が明示されている (AI 生成等)

## 出力形式
```
# API レビュー結果: <path>

## 観点別評価
### 1. レイヤー依存 — [Pass / Issue]
- (具体的な行番号・コード引用付き)

### 2. Interface First — [Pass / Issue]
- ...

...

## 総合評価: S / A / B / C / D

## 修正必須項目 (Critical)
1. ...

## 改善提案 (Recommended)
1. ...
```

## 注意
- 軽微な問題と致命的な問題を明確に区別する
- 具体的なファイル名・行番号・該当コードを引用する
- 設計書の該当章を参照する (例: 「`docs/06_backend_design.md` 第 3 章参照」)
