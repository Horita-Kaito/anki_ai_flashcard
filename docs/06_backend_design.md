# バックエンド設計書

本書は Laravel (PHP 8.3) で構築されるバックエンドの **アーキテクチャ・命名規則・依存方針** を厳密に定義する。

> 前提: 将来的に公式リリース・収益化を行う。差し替え容易性・テスト容易性・セキュリティを初期から担保する。

---

## 1. 設計思想

### 1-1. 基本原則
1. **Interface First** — 全ての外部依存 (DB, AI, 外部API) は Interface 経由で使う。具象実装を直接 import しない。
2. **Repository Pattern** — モデルへのアクセスは Repository 経由のみ。Controller/Service は Eloquent を直接触らない。
3. **Service Layer** — ビジネスロジックは Service に集約。Controller は薄く保つ。
4. **Dependency Injection (DI)** — Laravel の Service Container を活用し、Interface にコンストラクタで具象を注入する。
5. **Single Responsibility** — 1 クラス 1 責務。Controller は HTTP 入出力、Service はロジック、Repository は永続化。
6. **Testability First** — 全 Interface はモック可能。Feature Test と Unit Test を明確に分離。

### 1-2. なぜ Repository パターンを採用するか
- Eloquent 固有のクエリが Service/Controller に漏れない
- テストで in-memory や fake Repository に差し替え可能
- 将来 DB 分離 / 読み書き分離 / 外部ストア移行時に影響範囲を局所化
- クエリロジックを 1 箇所に集約 (N+1 予防、インデックス最適化の観点でも有利)

---

## 2. ディレクトリ構成

```
backend/app/
├── Contracts/                       # 契約 (Interface 定義のみ、実装を含まない)
│   ├── Repositories/
│   │   ├── DeckRepositoryInterface.php
│   │   ├── CardRepositoryInterface.php
│   │   └── ...
│   └── Services/
│       ├── AI/
│       │   └── AiProviderInterface.php
│       └── Review/
│           └── SchedulerInterface.php
│
├── Repositories/                    # Repository 具象実装 (Eloquent)
│   ├── EloquentDeckRepository.php
│   ├── EloquentCardRepository.php
│   └── ...
│
├── Services/                        # ビジネスロジック
│   ├── DeckService.php
│   ├── CardService.php
│   ├── AI/                          # AI プロバイダ具象
│   │   ├── OpenAiProvider.php
│   │   ├── AnthropicProvider.php
│   │   └── CardGenerationService.php
│   └── Review/                      # スケジューラ具象
│       └── Sm2Scheduler.php
│
├── Http/
│   ├── Controllers/
│   │   ├── Controller.php
│   │   ├── Auth/
│   │   └── Api/V1/
│   │       ├── DeckController.php
│   │       └── ...
│   ├── Requests/                    # FormRequest (バリデーション)
│   │   └── <Resource>/
│   │       ├── Store<Resource>Request.php
│   │       └── Update<Resource>Request.php
│   ├── Resources/                   # API Resource (レスポンス整形)
│   │   └── <Resource>Resource.php
│   └── Middleware/
│
├── Models/                          # Eloquent モデル (Repository からのみ参照)
│
├── Policies/                        # 認可
│
├── Providers/
│   ├── AppServiceProvider.php
│   └── RepositoryServiceProvider.php   # Interface → 実装のバインド
│
├── Exceptions/                      # ドメイン例外
│   ├── Domain/
│   │   ├── DeckNotFoundException.php
│   │   └── ...
│   └── Api/
│       └── ApiException.php
│
└── Enums/                           # PHP 8.1+ Enum
    ├── CardType.php
    └── ReviewRating.php
```

### 2-1. レイヤー依存ルール (重要)

```
Controller  →  Service  →  Repository  →  Model (Eloquent)
     ↓           ↓              ↓
     └──────→ Contracts  ←──────┘
               (Interface)
```

- **Controller は Service Interface にのみ依存** (具象 Service を直接 new しない)
- **Service は Repository Interface にのみ依存** (Eloquent Model を直接触らない)
- **Service から他の Service を呼ぶときも Interface 経由**
- **Repository は具象 Model を触ってよい** (最下層)
- **下のレイヤーは上のレイヤーを知らない** (Repository は Controller を知らない)

### 2-2. 禁止事項
- Controller に Eloquent クエリを書く
- Service で `new` で具象を作る (DI で受け取る)
- Model 内に重いビジネスロジックを書く (Scope や Accessor/Mutator 程度まで)
- Facade の濫用 (`Auth::user()` はユースケースによっては許容だが、テスト容易性のため DI を優先)
- Repository が Request や HTTP レスポンスに依存する

---

## 3. Interface / Repository / Service のパターン

### 3-1. Repository Interface
```php
<?php

namespace App\Contracts\Repositories;

use App\Models\Deck;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface DeckRepositoryInterface
{
    public function findForUser(int $userId, int $deckId): ?Deck;

    /** @return LengthAwarePaginator<Deck> */
    public function paginateForUser(int $userId, int $perPage = 20): LengthAwarePaginator;

    public function create(int $userId, array $attributes): Deck;

    public function update(Deck $deck, array $attributes): Deck;

    public function delete(Deck $deck): void;
}
```

**ルール**:
- メソッド名は **ユースケース寄り** (`findForUser`, `paginateForUser` 等)。`findById` のような汎用名を濫用しない。
- 戻り値の型は必ず宣言 (nullable `?` を含む)。
- コレクション戻りには PHPDoc で型を明示 (`@return LengthAwarePaginator<Deck>`)。
- ページネーションは Interface レベルでページサイズを受け取る。

### 3-2. Repository 具象実装
```php
<?php

namespace App\Repositories;

use App\Contracts\Repositories\DeckRepositoryInterface;
use App\Models\Deck;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class EloquentDeckRepository implements DeckRepositoryInterface
{
    public function findForUser(int $userId, int $deckId): ?Deck
    {
        return Deck::query()
            ->where('user_id', $userId)
            ->where('id', $deckId)
            ->first();
    }

    public function paginateForUser(int $userId, int $perPage = 20): LengthAwarePaginator
    {
        return Deck::query()
            ->where('user_id', $userId)
            ->orderByDesc('updated_at')
            ->paginate($perPage);
    }

    public function create(int $userId, array $attributes): Deck
    {
        return Deck::create([...$attributes, 'user_id' => $userId]);
    }

    public function update(Deck $deck, array $attributes): Deck
    {
        $deck->update($attributes);
        return $deck->refresh();
    }

    public function delete(Deck $deck): void
    {
        $deck->delete();
    }
}
```

**ルール**:
- クラスは `final` (継承不可)
- `Eloquent` の query builder を使い、生 SQL は極力避ける
- **全クエリに `user_id` 制約を入れる** (マルチテナント前提)
- N+1 は `with()` で即座に解消

### 3-3. Service
```php
<?php

namespace App\Services;

use App\Contracts\Repositories\DeckRepositoryInterface;
use App\Models\Deck;
use App\Exceptions\Domain\DeckNotFoundException;

final class DeckService
{
    public function __construct(
        private readonly DeckRepositoryInterface $deckRepository,
    ) {}

    public function getForUser(int $userId, int $deckId): Deck
    {
        $deck = $this->deckRepository->findForUser($userId, $deckId);
        if ($deck === null) {
            throw new DeckNotFoundException("Deck {$deckId} not found for user {$userId}");
        }
        return $deck;
    }

    public function createForUser(int $userId, array $attributes): Deck
    {
        // 将来: プラン制限チェック、タグ数制限、など
        return $this->deckRepository->create($userId, $attributes);
    }
}
```

**ルール**:
- **クラスは `final`**
- **コンストラクタプロパティプロモーション** を使う (`private readonly`)
- 依存は Interface 型のみ
- ドメイン例外 (`DeckNotFoundException`) を throw、HTTP例外は Controller で変換
- 複数 Repository を束ねる場合 `DB::transaction(...)` で囲む

### 3-4. Controller
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Deck\StoreDeckRequest;
use App\Http\Resources\DeckResource;
use App\Services\DeckService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class DeckController extends Controller
{
    public function __construct(
        private readonly DeckService $deckService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $decks = $this->deckService->paginateForUser(
            userId: $request->user()->id,
            perPage: (int) $request->query('per_page', 20),
        );
        return DeckResource::collection($decks)->response();
    }

    public function store(StoreDeckRequest $request): JsonResponse
    {
        $deck = $this->deckService->createForUser(
            userId: $request->user()->id,
            attributes: $request->validated(),
        );
        return (new DeckResource($deck))->response()->setStatusCode(201);
    }
}
```

**ルール**:
- Controller は **薄く**。バリデーション済みデータを Service に渡すだけ。
- Service 層と同様に `final` + constructor promotion
- FormRequest でバリデーション、API Resource でレスポンス整形
- **Controller 内で Eloquent を直接触らない**

### 3-5. DI バインディング
`app/Providers/RepositoryServiceProvider.php`:
```php
<?php

namespace App\Providers;

use App\Contracts\Repositories\DeckRepositoryInterface;
use App\Repositories\EloquentDeckRepository;
use Illuminate\Support\ServiceProvider;

final class RepositoryServiceProvider extends ServiceProvider
{
    /** @var array<class-string, class-string> */
    private array $bindings = [
        DeckRepositoryInterface::class => EloquentDeckRepository::class,
        // ...
    ];

    public function register(): void
    {
        foreach ($this->bindings as $abstract => $concrete) {
            $this->app->bind($abstract, $concrete);
        }
    }
}
```

AI/Scheduler のような **切替可能な依存** は設定駆動:
```php
// AI プロバイダをユーザー設定 or env で切替
$this->app->bind(AiProviderInterface::class, function ($app) {
    $provider = config('ai.default_provider'); // openai | anthropic | google
    return match ($provider) {
        'openai' => $app->make(OpenAiProvider::class),
        'anthropic' => $app->make(AnthropicProvider::class),
        default => throw new \InvalidArgumentException("Unknown AI provider: {$provider}"),
    };
});
```

---

## 4. 命名規則

### 4-1. ファイル / クラス
| 対象 | 規則 | 例 |
|------|------|-----|
| Interface | `XxxInterface` 接尾辞 | `DeckRepositoryInterface`, `AiProviderInterface` |
| Repository 具象 | `XxxRepository` (Eloquent の場合 `Eloquent` prefix) | `EloquentDeckRepository` |
| Service | `XxxService` | `DeckService`, `CardGenerationService` |
| Controller | `XxxController` (リソース名は単数) | `DeckController` |
| FormRequest | `{Store|Update|Destroy}XxxRequest` | `StoreDeckRequest` |
| Resource | `XxxResource` | `DeckResource` |
| Policy | `XxxPolicy` | `DeckPolicy` |
| Exception | `XxxException` | `DeckNotFoundException` |
| Enum | 名詞単数 | `CardType`, `ReviewRating` |

### 4-2. メソッド
- Repository: `findForUser`, `paginateForUser`, `create`, `update`, `delete`, `existsForUser`
- Service: ユースケース表現 (`generateCandidates`, `adoptCandidate`, `evaluateReview`)
- Controller: REST 規約 (`index`, `show`, `store`, `update`, `destroy`)
- カスタムアクション: 動詞 (`adopt`, `regenerate`, `restore`)

### 4-3. 変数
- snake_case (PSR-12)
- Boolean: `is_suspended`, `has_expired`

---

## 5. バリデーション

### 5-1. FormRequest で完結させる
```php
<?php

namespace App\Http\Requests\Deck;

use Illuminate\Foundation\Http\FormRequest;

final class StoreDeckRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // 認証は middleware で担保
    }

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'default_domain_template_id' => ['nullable', 'integer', 'exists:domain_templates,id'],
            'new_cards_limit' => ['nullable', 'integer', 'min:1', 'max:100'],
            'review_limit' => ['nullable', 'integer', 'min:1', 'max:500'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'name.required' => 'デッキ名を入力してください',
            'name.max' => 'デッキ名は255文字以内で入力してください',
        ];
    }
}
```

**ルール**:
- **全 POST/PUT/PATCH は必ず FormRequest を作る**
- `exists:` ルールで参照整合性をチェック、さらに Policy で所有者チェック
- メッセージは日本語で具体的に

### 5-2. ユーザー所有物の参照チェック
`exists:decks,id` だけでは他ユーザーのリソースも通ってしまう。必ず `Rule::exists('decks', 'id')->where('user_id', $this->user()->id)` で絞る。

---

## 6. 認可 (Policy)

```php
<?php

namespace App\Policies;

use App\Models\Deck;
use App\Models\User;

final class DeckPolicy
{
    public function view(User $user, Deck $deck): bool
    {
        return $deck->user_id === $user->id;
    }

    public function update(User $user, Deck $deck): bool
    {
        return $deck->user_id === $user->id;
    }

    public function delete(User $user, Deck $deck): bool
    {
        return $deck->user_id === $user->id;
    }
}
```

Controller で `$this->authorize('update', $deck);` を呼ぶ。Route Model Binding + `->middleware('can:...')` でも良い。

---

## 7. レスポンス形式

### 7-1. API Resource
```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class DeckResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'default_domain_template_id' => $this->default_domain_template_id,
            'new_cards_limit' => $this->new_cards_limit,
            'review_limit' => $this->review_limit,
            'card_count' => $this->whenLoaded('cards', fn () => $this->cards->count()),
            'due_count' => $this->when(isset($this->due_count), $this->due_count),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
```

### 7-2. エラーレスポンス統一
- `Handler::render` でドメイン例外 → HTTP レスポンス変換を集中管理
- `DeckNotFoundException` → 404, `ValidationException` → 422, 等

---

## 8. Enum

カード種別、評価等の固定値は **PHP 8.1 Enum** を使う。

```php
<?php

namespace App\Enums;

enum CardType: string
{
    case BasicQa = 'basic_qa';
    case Comparison = 'comparison';
    case PracticalCase = 'practical_case';
    case ClozeLike = 'cloze_like';
}
```

Eloquent の casts に指定してランタイムでバリデーション:
```php
protected function casts(): array
{
    return ['card_type' => CardType::class];
}
```

---

## 9. 例外・エラーハンドリング

### 9-1. ドメイン例外
```
app/Exceptions/Domain/
├── DeckNotFoundException.php
├── CardNotFoundException.php
├── AiGenerationFailedException.php
└── DomainException.php  (基底)
```

### 9-2. ハンドリング
`bootstrap/app.php` (Laravel 11+):
```php
->withExceptions(function (Exceptions $exceptions) {
    $exceptions->render(function (DeckNotFoundException $e, Request $request) {
        return response()->json(['message' => 'デッキが見つかりません'], 404);
    });
});
```

### 9-3. AI プロバイダの例外
- タイムアウト、JSON 破損、Rate Limit はそれぞれ個別の例外クラスに
- Service で再試行戦略を実装、最終的に `AiGenerationFailedException`

---

## 10. テスト戦略

テスト戦略の **正典は `docs/07_testing_strategy.md`**。概要のみ以下に示す。

| 層 | ツール | 対象 | 方針 |
|----|--------|------|------|
| **Unit** | PHPUnit | Service, Scheduler 等の純粋ロジック | Repository Interface をモックして検証 |
| **Unit (Repo)** | PHPUnit + in-memory SQLite | Repository | 実 DB でクエリを検証 |
| **Feature** | PHPUnit (HTTP) | Controller + Middleware + 認可 | 実 DB + RefreshDatabase |
| **Integration** | PHPUnit + Http::fake() | AI プロバイダ | 外部 API をモック |

### 10-1. 必須テスト項目 (全 Controller)
- 認証なしで 401
- バリデーションエラーで 422
- 他ユーザーのリソースで 403 or 404
- 正常系のレスポンス形状 (`assertJsonStructure`)
- CRUD の副作用 (`assertDatabaseHas`)

### 10-2. モック (Interface の恩恵)
```php
$this->mock(DeckRepositoryInterface::class, function ($mock) {
    $mock->shouldReceive('findForUser')
        ->with(1, 10)
        ->once()
        ->andReturn(new Deck(['id' => 10, 'name' => 'Test']));
});
```

### 10-3. コマンド
```bash
docker compose exec backend php artisan test
docker compose exec backend php artisan test --filter DeckControllerTest
docker compose exec backend php artisan test --testsuite=Unit
docker compose exec backend php artisan test --coverage
```

### 10-4. カバレッジ目標
- Services: 80%+ / Repositories: 70%+ / 全体 70%+

---

## 11. セキュリティ (必須事項)

### 11-1. 必ず実装
- 認証系エンドポイントに `throttle:5,1` (ブルートフォース)
- 一般 API に `throttle:60,1` (Sanctum SPA ミドルウェア込み)
- AI 生成系に `throttle:10,60` (コスト爆発防止)
- 全リソースアクセスに user_id スコープ or Policy
- CSRF Cookie 必須 (Sanctum SPA)
- 本番 `APP_DEBUG=false`
- パスワードは `Hash::make` (bcrypt 12 rounds)

### 11-2. SQL Injection 防止
- Eloquent / Query Builder のパラメータバインディングを使う
- LIKE 検索時は `%` `_` をエスケープ

### 11-3. Mass Assignment 防止
- Model に `$fillable` を必ず定義
- Attribute 属性でも可 (Laravel 11+)

### 11-4. レスポンスでの情報漏洩防止
- User モデルに `$hidden = ['password', 'remember_token']`
- AI 生レスポンスをそのまま返さず、必要なフィールドのみに整形

---

## 12. パフォーマンス

### 初期から気をつけること
- N+1 は `with()` で解消。`toucan` (Debugbar) や `laravel/telescope` で検知
- インデックスは DB 設計書通りに必ず張る
- ページネーションは `simplePaginate` (count が重い場合) と `paginate` を使い分け
- AI 呼び出しは Queue Worker で非同期化 (Phase 2 以降)

### 将来追加
- Redis キャッシュ (統計、ダッシュボード集計)
- DB クエリログをモニタリングに

---

## 13. ロギング・監査

- **AI 生成ログ**: provider, model, prompt_version, input, output, duration, succeeded
- **認証イベント**: login, logout, failed login (IP含む)
- **データ変更イベント**: カード採用、デッキ削除等は `activity_log` 的に保存 (将来)
- ログレベル: 本番は `warning` 以上、開発は `debug`

---

## 14. 収益化への備え

### 14-1. プラン概念
- `users.plan` enum カラム (`free`, `pro`) を将来マイグレーションで追加
- Service 層でプラン制限をチェック (`$this->planGuard->ensure($user, 'ai_generation');` 等)

### 14-2. 使用量トラッキング
- `ai_generation_usages` テーブルで月次カウント
- レート制限を plan ベースに拡張

### 14-3. 決済連携
- Stripe SDK は `app/Services/Billing/` に集約 (Phase 4 以降)

---

## 15. ワークフロー (Claude Code Skills)

| skill | 用途 | 起動 |
|-------|------|------|
| `api-new-resource` | 新リソースの CRUD 一式 scaffold (Interface/Repository/Service/Controller/Request/Resource/Policy/Model/Migration/Test) | `/api-new-resource <name>` |
| `api-new-service` | 新しい Service + Interface を追加 | `/api-new-service <name>` |
| `api-new-migration` | 命名規則・インデックス規約に沿ったマイグレーション | `/api-new-migration <table> <change>` |
| `api-review` | バックエンドコードを設計ルールに照らしてセルフレビュー | `/api-review <path>` |

---

## 16. チェックリスト (PR/コミット前)

### コード品質
- [ ] `composer run test` (PHPUnit) が通る
- [ ] `./vendor/bin/pint --test` が通る
- [ ] Interface First が守られている (Controller → Service interface → Repository interface)
- [ ] 全クラスが `final`
- [ ] constructor promotion を使っている
- [ ] 戻り値型・引数型を宣言している
- [ ] PHPDoc で配列の要素型を明示 (`array<string, mixed>` 等)

### 設計
- [ ] Controller に Eloquent クエリがない
- [ ] Service が具象を `new` していない
- [ ] 新規クラスは `RepositoryServiceProvider` にバインドされている (Repository の場合)
- [ ] FormRequest が作られている (POST/PUT/PATCH の場合)
- [ ] API Resource が作られている
- [ ] Policy or user_id スコープで認可されている

### セキュリティ
- [ ] 新エンドポイントに throttle が設定されている
- [ ] 他ユーザーのリソースにアクセス不可 (Policy テストが通る)
- [ ] バリデーションで exists ルール + user_id スコープ
- [ ] Mass Assignment 対策 (`$fillable`)

### テスト
- [ ] Feature テスト (Controller) を書いた
- [ ] Unit テスト (Service の重要ロジック) を書いた
- [ ] 認可エラー (403) のテストがある
- [ ] バリデーションエラー (422) のテストがある
