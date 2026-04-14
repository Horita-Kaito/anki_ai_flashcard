---
name: api-new-resource
description: |
  **必ず使用する条件**: backend/app/ に新しいドメインリソース (deck, card, note_seed, ai_card_candidate, domain_template 等) のテーブル + CRUD API を追加するすべてのタスク。ユーザーが「deck リソース作って」「card のAPI追加」「マイグレーションとコントローラ作って」等と指示した場合、作業開始前にこの skill を必ず起動すること。
  やること: Interface + Repository + Service + Controller + FormRequest + Resource + Policy + Model + Migration + Factory + Feature Test + Unit Test を Repository パターン+DI で一括 scaffold し、RepositoryServiceProvider への bind 登録、ルート追加、throttle 設定、user_id スコープ、Policy 所有者チェックまで含める。
  使わない場合: 既存リソースに単発のエンドポイント追加のみは api-new-service / 直接 Controller 追加。マイグレーションだけなら api-new-migration。
  必ず docs/06_backend_design.md に従うこと。
---

# API New Resource Skill

新しいドメインリソースを Repository パターン + DI + Interface に沿って一気に構築する。

## 前提ドキュメント
作業前に必ず `docs/06_backend_design.md` を参照する。特に:
- 第 2 章 (ディレクトリ構成・レイヤー依存ルール)
- 第 3 章 (Interface / Repository / Service のパターン)
- 第 4 章 (命名規則)

## 引数
`<resource-name>` — **snake_case の単数形**。例: `deck`, `card`, `note_seed`, `ai_card_candidate`, `domain_template`。

内部で以下を派生:
- クラス名: `Deck` (PascalCase 単数)
- テーブル名: `decks` (snake_case 複数)
- ルート: `/decks` (kebab-case 複数)
- 変数名: `$deck`

## 生成するファイル一覧

| 種別 | パス | 備考 |
|------|------|------|
| Model | `app/Models/Deck.php` | `$fillable` 必須、リレーション定義 |
| Migration | `database/migrations/YYYY_MM_DD_create_decks_table.php` | `docs/02_er_diagram.md` のカラム定義に沿う |
| Factory | `database/factories/DeckFactory.php` | テスト用 |
| Repository Interface | `app/Contracts/Repositories/DeckRepositoryInterface.php` | |
| Repository 実装 | `app/Repositories/EloquentDeckRepository.php` | `final class` |
| Service | `app/Services/DeckService.php` | `final class`、Repository Interface を DI |
| Controller | `app/Http/Controllers/Api/V1/DeckController.php` | `final class`、Service を DI |
| StoreRequest | `app/Http/Requests/Deck/StoreDeckRequest.php` | |
| UpdateRequest | `app/Http/Requests/Deck/UpdateDeckRequest.php` | |
| Resource | `app/Http/Resources/DeckResource.php` | |
| Policy | `app/Policies/DeckPolicy.php` | `view/update/delete` メソッド |
| Exception | `app/Exceptions/Domain/DeckNotFoundException.php` | 必要に応じて |
| Feature Test | `tests/Feature/Api/V1/DeckControllerTest.php` | CRUD + 認可 + バリデーション |
| Unit Test | `tests/Unit/Services/DeckServiceTest.php` | Repository をモック |

## 手順

### 1. 既存ファイルとの衝突確認
`app/Models/Deck.php` 等が既に存在しないか確認。

### 2. Migration 作成
`docs/02_er_diagram.md` の該当テーブル定義をそのまま反映する。必須:
- `$table->foreignId('user_id')->constrained()->cascadeOnDelete();`
- 複合インデックス `$table->index(['user_id', '<ソート/絞り込みキー>']);`
- `timestamps()`

### 3. Model
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Deck extends Model
{
    use HasFactory;

    /** @var array<int, string> */
    protected $fillable = [
        'user_id',
        'name',
        'description',
        // ...
    ];

    /** @return BelongsTo<User, self> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

### 4. Repository Interface + 実装

Interface は **ユースケース寄りのメソッド名** を使う。例:
- `findForUser(int $userId, int $deckId): ?Deck`
- `paginateForUser(int $userId, int $perPage): LengthAwarePaginator`
- `create(int $userId, array $attributes): Deck`
- `update(Deck $deck, array $attributes): Deck`
- `delete(Deck $deck): void`

実装は `final class EloquentDeckRepository implements DeckRepositoryInterface` で、全クエリに `user_id` 制約を入れる。

### 5. RepositoryServiceProvider に登録
`app/Providers/RepositoryServiceProvider.php` の `$bindings` 配列に追加:
```php
DeckRepositoryInterface::class => EloquentDeckRepository::class,
```

**存在しなければ作る**。`bootstrap/providers.php` への登録も忘れずに。

### 6. Service
```php
final class DeckService
{
    public function __construct(
        private readonly DeckRepositoryInterface $deckRepository,
    ) {}

    public function getForUser(int $userId, int $deckId): Deck { /* ... */ }
    public function paginateForUser(int $userId, int $perPage): LengthAwarePaginator { /* ... */ }
    public function createForUser(int $userId, array $attributes): Deck { /* ... */ }
    public function updateForUser(int $userId, int $deckId, array $attributes): Deck { /* ... */ }
    public function deleteForUser(int $userId, int $deckId): void { /* ... */ }
}
```

- not found の場合は `DeckNotFoundException` を throw
- 複数 Repository をまたぐ処理は `DB::transaction()`

### 7. FormRequest
`docs/03_api_specification.md` のバリデーション要件に従う。

- `rules()` で全フィールドをバリデーション
- `exists:` ルールは `Rule::exists(...)->where('user_id', ...)` で他ユーザー参照を防ぐ
- 日本語メッセージを `messages()` に定義

### 8. Resource
`docs/03_api_specification.md` のレスポンス例に従う。`toArray()` で必要フィールドのみ返す。

### 9. Controller
```php
final class DeckController extends Controller
{
    public function __construct(
        private readonly DeckService $deckService,
    ) {}

    public function index(Request $request): JsonResponse { /* ... */ }
    public function store(StoreDeckRequest $request): JsonResponse { /* ... */ }
    public function show(Request $request, int $id): JsonResponse { /* ... */ }
    public function update(UpdateDeckRequest $request, int $id): JsonResponse { /* ... */ }
    public function destroy(Request $request, int $id): JsonResponse { /* ... */ }
}
```

### 10. Policy
`user_id` 一致で view/update/delete を許可。Controller 内で `$this->authorize('update', $deck);` を必ず呼ぶ。

### 11. ルート登録
`routes/api.php` の `v1` + `auth:sanctum` グループに追加:
```php
Route::apiResource('decks', DeckController::class);
```

Rate Limiting が必要なら `->middleware('throttle:60,1')` を追加。

### 12. テスト
**Feature Test** (必須):
- GET index: 認証済みで自分のデッキのみ返る
- GET show: 他ユーザーのデッキは 404
- POST store: バリデーション成功・失敗
- PUT update: 他ユーザーのデッキは 403
- DELETE destroy: カスケード削除の確認

**Unit Test**:
- Service のロジック (Repository をモック)
- DeckNotFoundException の発火

### 13. 最終チェック
- [ ] `docker compose exec backend php artisan migrate` が通る
- [ ] `docker compose exec backend php artisan test --filter DeckControllerTest` が通る
- [ ] `./vendor/bin/pint` が通る
- [ ] Controller に Eloquent クエリがない
- [ ] Service が `new` で具象を作っていない
- [ ] 全クラスが `final` (Model, Request を除く)

## 注意事項
- Mass Assignment: `$fillable` を必ず定義
- `user_id` を `$fillable` に入れる (Service から渡すため)
- Eloquent の `create` で `$fillable` に無いキーが来たら例外になるので注意
- 新規エンドポイントは必ず `docs/03_api_specification.md` に沿う
