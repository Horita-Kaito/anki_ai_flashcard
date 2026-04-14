---
name: api-new-service
description: |
  **必ず使用する条件**: backend/app/Services/ に新しい Service クラスを作成するすべてのタスク、特に差し替え可能な戦略 (AI プロバイダ、スケジューラ、決済、通知等) を実装する場合。ユーザーが「CardGenerationService 作って」「スケジューラ実装して」「AI プロバイダ追加」等と指示した場合、この skill を必ず起動すること。
  やること: Interface First 原則で Contracts/Services/ に Interface を配置、Services/ に final class 具象を配置、AppServiceProvider または RepositoryServiceProvider に DI バインディング登録 (単純 1対1 または設定駆動 match 切替)、テスト雛形、例外クラス、config ファイル (AI 系の場合) まで準備する。
  使わない場合: CRUD リソース全体を作る場合は api-new-resource。既存 Service にメソッド追加のみなら skill 不要。
  必ず docs/06_backend_design.md に従うこと。
---

# API New Service Skill

ビジネスロジックの Service を Interface + 具象 + DI バインディング付きで追加する。

## 前提ドキュメント
- `docs/06_backend_design.md`
  - 第 3 章 (Interface / Repository / Service のパターン)
  - 3-5 (DI バインディング)

## 引数
`<service-name>` — **kebab-case**。例: `card-generation`, `ai-provider`, `sm2-scheduler`。

内部で以下を派生:
- クラス名: `CardGenerationService` (Service接尾辞付き PascalCase)
- Interface 名: `CardGenerationServiceInterface`

## 判断フロー

### 1. Interface を作る必要があるか
以下のいずれかなら **必ず Interface を作る**:
- 実装を差し替える可能性がある (AI プロバイダ、スケジューラ、決済プロバイダ等)
- テストで mock したい
- 複数の具象がありうる

不要なケース:
- アプリ内で唯一の実装しかなく、テストでもモック不要な単純な Service

### 2. 配置
| 種類 | Interface | 具象 |
|------|-----------|------|
| 通常のドメイン Service | `app/Contracts/Services/<Name>ServiceInterface.php` | `app/Services/<Name>Service.php` |
| AI プロバイダ | `app/Contracts/Services/AI/AiProviderInterface.php` | `app/Services/AI/<Provider>Provider.php` |
| スケジューラ | `app/Contracts/Services/Review/SchedulerInterface.php` | `app/Services/Review/<Algo>Scheduler.php` |

## 手順

### 1. Interface 作成
```php
<?php

namespace App\Contracts\Services;

use App\Models\NoteSeed;
use App\Models\DomainTemplate;

interface CardGenerationServiceInterface
{
    /**
     * メモから AI でカード候補を生成する
     *
     * @param array{count?: int, preferred_card_types?: array<string>} $options
     * @return array<int, AiCardCandidate>
     */
    public function generate(
        NoteSeed $noteSeed,
        ?DomainTemplate $template,
        array $options = [],
    ): array;
}
```

**ルール**:
- PHPDoc で配列の要素型を明示
- 引数は object (Model) 優先、プリミティブは named arguments で渡しやすくする
- 例外は Interface レベルで throw 宣言 (PHPDoc `@throws`)

### 2. 具象実装
```php
<?php

namespace App\Services;

use App\Contracts\Services\CardGenerationServiceInterface;
use App\Contracts\Services\AI\AiProviderInterface;
use App\Contracts\Repositories\AiCardCandidateRepositoryInterface;

final class CardGenerationService implements CardGenerationServiceInterface
{
    public function __construct(
        private readonly AiProviderInterface $aiProvider,
        private readonly AiCardCandidateRepositoryInterface $candidateRepository,
    ) {}

    public function generate(NoteSeed $noteSeed, ?DomainTemplate $template, array $options = []): array
    {
        // ...
    }
}
```

- **`final`** 必須
- **constructor promotion** を使う
- **他の Interface のみを依存** として受け取る

### 3. DI バインディング

#### 単純な 1対1 バインディング
`app/Providers/AppServiceProvider.php` の `register()` に追加:
```php
$this->app->bind(
    CardGenerationServiceInterface::class,
    CardGenerationService::class,
);
```

#### 設定駆動の切替 (AI プロバイダのように)
```php
$this->app->bind(AiProviderInterface::class, function ($app) {
    $provider = config('ai.default_provider');
    return match ($provider) {
        'openai' => $app->make(OpenAiProvider::class),
        'anthropic' => $app->make(AnthropicProvider::class),
        'google' => $app->make(GoogleAiProvider::class),
        default => throw new \InvalidArgumentException("Unknown AI provider: {$provider}"),
    };
});
```

設定ファイル `config/ai.php` を作成 (存在しなければ):
```php
<?php
return [
    'default_provider' => env('DEFAULT_AI_PROVIDER', 'openai'),
    'default_model' => env('DEFAULT_AI_MODEL', 'gpt-4o-mini'),
];
```

### 4. 例外クラス (必要に応じて)
```
app/Exceptions/Domain/<Name>Exception.php
```

Handler で HTTP レスポンスに変換する登録を忘れずに。

### 5. テスト

**Unit Test** — Interface をモックして呼び出し側の挙動を検証:
```php
public function test_generate_calls_ai_provider(): void
{
    $aiProvider = $this->mock(AiProviderInterface::class);
    $aiProvider->shouldReceive('generate')->once()->andReturn([...]);

    $service = app(CardGenerationServiceInterface::class);
    $result = $service->generate(...);

    $this->assertCount(3, $result);
}
```

**Integration Test** — 実際の具象で動作確認 (外部API はモック):
```php
public function test_openai_provider_returns_structured_candidates(): void
{
    Http::fake([
        'api.openai.com/*' => Http::response([...], 200),
    ]);
    // ...
}
```

### 6. ドキュメント追記
Service が外部 API と通信する場合、`docs/06_backend_design.md` の 9-3 (AIプロバイダの例外) のような記述を追加検討。

### 7. チェック
- [ ] `docker compose exec backend php artisan test` が通る
- [ ] `./vendor/bin/pint` が通る
- [ ] Interface が `app/Contracts/Services/` 配下に置かれている
- [ ] 具象が `final class` で `Interface` を `implements` している
- [ ] DI バインディングが Service Provider に登録されている
- [ ] `app()->make(Interface::class)` で具象が解決できる
- [ ] テストで Interface がモック可能

## NG 例
- Service 内で `new Xxx()` で具象を生成
- Interface を作らずに具象に直接依存する Service
- Facade 濫用 (`Http::`, `DB::` は OK だが、独自サービスは DI)
- Service が `Request` や `Response` に依存する (Controller の責務)
- 1 Service が複数の責務を持つ (分割する)
