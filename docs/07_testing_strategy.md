# テスト戦略

本書は本プロジェクトの **テスト方針・ツール選定・書き方・CI運用** を統一的に定める。

> 本書はフロントエンド/バックエンド両方の正典。`docs/05_frontend_design.md` § 10 と `docs/06_backend_design.md` § 10 はここを参照する。

---

## 1. 方針 (基本原則)

### 1-1. テストピラミッド
```
         /\
        /  \      E2E (少量、主要ユーザーフロー)
       /----\
      / 結合 \    Integration (feature 単位 + API モック)
     /--------\
    /   単体   \  Unit (hook, service, schema, util)
   /____________\
  / Component    \ Component (RTL / Feature Test)
 /________________\
```

### 1-2. 何をテストするか
- **書く**: ビジネスロジック、バリデーション、認可、エラーハンドリング、ユーザーに見える挙動
- **書かない**: 実装の詳細 (内部 state の形)、フレームワーク機能そのもの、自明な getter/setter、モックのモック

### 1-3. テスト名は日本語 OK
`test_it_rejects_other_users_deck` よりも `test_他ユーザーのデッキは404を返す` の方が読みやすければそちらを採用。**読み手のコストを最小化する**。

### 1-4. 1 テスト 1 概念
複数アサーションは OK だが、**複数の振る舞い** を 1 テストに詰め込まない。

### 1-5. Arrange-Act-Assert
```
// Arrange (準備)
$user = User::factory()->create();

// Act (実行)
$response = $this->actingAs($user)->postJson('/api/v1/decks', [...]);

// Assert (検証)
$response->assertStatus(201);
```

### 1-6. バグ修正には必ず回帰テスト
バグ報告 → **失敗するテストを先に書く** → 修正 → テスト通過。

---

## 2. バックエンド (Laravel / PHPUnit)

### 2-1. テスト種別

| 種別 | 目的 | 対象 | ディレクトリ |
|------|------|------|-------------|
| **Unit** | 純粋ロジックの検証 | Service, Scheduler, Value Object | `tests/Unit/` |
| **Feature** | HTTP 入出力の検証 | Controller, Middleware, 認可 | `tests/Feature/` |
| **Integration** | 外部依存を含む境界の検証 | AI プロバイダ (レスポンスモック) | `tests/Feature/` (サブディレクトリ分け) |

### 2-2. ツール
- **PHPUnit 11** (Laravel 標準)
- **Mockery** (Interface モック)
- **Http::fake()** (外部 HTTP)
- **Queue::fake()** (キュー)
- **Event::fake()** (イベント)
- **Database**: `:memory:` SQLite (`phpunit.xml` で設定済み)
  - MySQL 固有機能 (JSON, 特定インデックス等) を使う場合のみ、`@group mysql` で分離
- **Factory** (Laravel factory)

### 2-3. ディレクトリ構成
```
tests/
├── Unit/
│   ├── Services/
│   │   ├── DeckServiceTest.php
│   │   └── Review/
│   │       └── Sm2SchedulerTest.php
│   ├── Repositories/
│   │   └── EloquentDeckRepositoryTest.php       # DB アクセスあり、in-memory
│   └── Enums/
│       └── CardTypeTest.php
├── Feature/
│   ├── Api/
│   │   └── V1/
│   │       ├── DeckControllerTest.php
│   │       └── ReviewSessionControllerTest.php
│   ├── Auth/
│   │   ├── LoginTest.php
│   │   └── RegisterTest.php
│   └── Integration/
│       └── AI/
│           └── OpenAiProviderTest.php            # Http::fake
└── TestCase.php
```

### 2-4. 命名規則
| 対象 | 規則 | 例 |
|------|------|-----|
| テストクラス名 | `<対象クラス名>Test` | `DeckServiceTest`, `DeckControllerTest` |
| テストメソッド | `test_` prefix or `#[Test]` attribute | `test_認証ユーザーはデッキを作成できる` |
| データプロバイダ | `<概念>Provider` メソッド | `invalidEmailProvider` |

### 2-5. 各レイヤーのテスト方針

#### Service (Unit)
- **Repository Interface をモック** して純粋なロジックのみ検証
- DB に触れない
- ドメイン例外の発火を検証

```php
final class DeckServiceTest extends TestCase
{
    public function test_他ユーザーのデッキを取得すると例外を投げる(): void
    {
        $repo = $this->mock(DeckRepositoryInterface::class);
        $repo->shouldReceive('findForUser')
            ->with(1, 99)
            ->andReturn(null);

        $service = new DeckService($repo);

        $this->expectException(DeckNotFoundException::class);
        $service->getForUser(1, 99);
    }
}
```

#### Repository (Unit + 実 DB)
- **実 DB (in-memory SQLite) を使う**
- クエリロジックとインデックス効きの検証
- `RefreshDatabase` trait

```php
final class EloquentDeckRepositoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_他ユーザーのデッキは取得されない(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();
        $deckB = Deck::factory()->for($userB)->create();

        $repo = app(DeckRepositoryInterface::class);

        $this->assertNull($repo->findForUser($userA->id, $deckB->id));
    }
}
```

#### Controller (Feature)
- **実際の HTTP リクエスト** で検証
- 認証・認可・バリデーション・レスポンス形状を網羅

```php
final class DeckControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_認証ユーザーはデッキ一覧を取得できる(): void
    {
        $user = User::factory()->create();
        Deck::factory()->count(3)->for($user)->create();

        $response = $this->actingAs($user)->getJson('/api/v1/decks');

        $response->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonStructure([
                'data' => [
                    ['id', 'name', 'description', 'created_at'],
                ],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);
    }

    public function test_未認証では401を返す(): void
    {
        $this->getJson('/api/v1/decks')->assertUnauthorized();
    }

    public function test_他ユーザーのデッキは取得できない(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();
        $deck = Deck::factory()->for($userB)->create();

        $this->actingAs($userA)
            ->getJson("/api/v1/decks/{$deck->id}")
            ->assertNotFound();
    }
}
```

#### AI プロバイダ (Integration)
- `Http::fake()` で外部 API のレスポンスを固定
- エラー応答、JSON 破損、タイムアウトを含む

### 2-6. 必須テスト項目 (全 Controller)
Controller を作ったら **必ず以下を書く**:
- [ ] 認証なしで 401
- [ ] バリデーションエラーで 422
- [ ] 他ユーザーのリソースアクセスで 403 or 404
- [ ] 正常系のレスポンス形状 (`assertJsonStructure`)
- [ ] CRUD の副作用 (`assertDatabaseHas`, `assertDatabaseMissing`)

### 2-7. カバレッジ目標
| 対象 | 目標 |
|------|------|
| Services | 80%+ |
| Repositories | 70%+ |
| Controllers | エンドポイント全件の Feature テスト |
| Policies | 全メソッド |
| **全体** | **70%+** (CI で失敗させる閾値は一旦設けない) |

### 2-8. 実行コマンド
```bash
# 全テスト
docker compose exec backend php artisan test

# 特定ファイル
docker compose exec backend php artisan test --filter DeckControllerTest

# Unit のみ
docker compose exec backend php artisan test --testsuite=Unit

# カバレッジ
docker compose exec backend php artisan test --coverage --min=70

# 並列実行
docker compose exec backend php artisan test --parallel
```

---

## 3. フロントエンド (Next.js / Vitest / Playwright)

### 3-1. テスト種別

| 種別 | 目的 | 対象 | ツール | ファイル配置 |
|------|------|------|--------|-------------|
| **Unit** | 純粋関数の検証 | utils, schemas (zod), custom hooks | Vitest | 同階層 `*.test.ts(x)` |
| **Component** | コンポーネント単体 | feature components, shared/ui | Vitest + Testing Library | 同階層 `*.test.tsx` |
| **Integration** | feature 単位のフロー | feature 全体 (MSW で API モック) | Vitest + MSW | `__tests__/` サブディレクトリ可 |
| **E2E** | 主要ユーザーフロー | ブラウザで画面操作 | Playwright | `frontend/e2e/` |

### 3-2. ツール
- **Vitest** (高速、Jest 互換 API)
- **@testing-library/react** (DOM 操作)
- **@testing-library/user-event** (ユーザーイベント)
- **@testing-library/jest-dom** (カスタムマッチャ)
- **MSW** (Service Worker で API モック)
- **jsdom** (DOM 環境)
- **Playwright** (E2E, モバイル/デスクトップ両対応)
- **@axe-core/playwright** (a11y 検証)

### 3-3. ファイル配置の原則
- **Co-location**: テスト対象と同じディレクトリに `*.test.ts(x)` を置く
- **Example**: `features/deck/components/deck-list.tsx` と `features/deck/components/deck-list.test.tsx`
- **理由**: 移動・削除が楽、見通しが良い
- **例外**: E2E は `frontend/e2e/` に集約

### 3-4. 命名規則
| 対象 | 規則 | 例 |
|------|------|-----|
| ファイル | `<target>.test.ts(x)` | `deck-list.test.tsx`, `auth-schemas.test.ts` |
| `describe` ブロック | コンポーネント名 or 関数名 | `describe("DeckList", ...)` |
| `it` / `test` | 日本語文でユーザー視点 | `it("読み込み中はスケルトンを表示する")` |

### 3-5. 各レイヤーのテスト方針

#### schema (Unit)
```ts
// features/auth/schemas/auth-schemas.test.ts
import { describe, it, expect } from "vitest";
import { loginSchema } from "./auth-schemas";

describe("loginSchema", () => {
  it("正しい入力を受け入れる", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("不正なメールアドレスを弾く", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });
});
```

#### Component (Testing Library)
```tsx
// features/auth/components/login-form.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./login-form";
import { renderWithProviders } from "@/test/render";

describe("LoginForm", () => {
  it("メールアドレスとパスワードを入力して送信できる", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText("メールアドレス"), "test@example.com");
    await user.type(screen.getByLabelText("パスワード"), "password123");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    // MSW が /api/v1/login を返す想定
    // アサーションは navigation や state を通じて行う
  });

  it("バリデーションエラーがアクセシブルに表示される", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(await screen.findByText(/メールアドレス/)).toBeInTheDocument();
  });
});
```

#### hook (Unit)
```ts
import { renderHook } from "@testing-library/react";
// QueryClientProvider で wrap する renderHook helper を shared/test に用意
```

#### E2E (Playwright)
- **主要フローのみ**: 5〜10 本に絞る
  1. サインアップ → ダッシュボード到達
  2. ログイン → ログアウト
  3. デッキ作成 → 一覧表示
  4. メモ作成 → AI 生成 → 候補採用 (Phase 2 後)
  5. 復習セッション開始 → 評価 → 完了 (Phase 3 後)
- **モバイル (375×667) とデスクトップ (1280×720) 両方で実行**
- **a11y 検証**: 各ページで `@axe-core/playwright` を回す

### 3-6. MSW (API モック)
- `frontend/src/test/msw/handlers.ts` にハンドラを集約
- テスト開始時に server を立ち上げ、テスト終了で停止
- Feature 別にハンドラを分離 (`handlers/auth.ts`, `handlers/deck.ts`)

### 3-7. 何をテストし、何をしないか
**する**:
- zod schema のバリデーション境界値
- feature container の loading/error/empty/success 状態
- フォーム送信とバリデーションエラー表示
- ボタンクリック → API 呼び出し → UI 更新の flow
- a11y (role, label が取れること)

**しない**:
- 単純な表示コンポーネントの trivial レンダリング
- Tailwind クラス名の検証 (visual regression は別ツール)
- Next.js/React 内部機能
- モックライブラリの挙動テスト

### 3-8. カバレッジ目標
| 対象 | 目標 |
|------|------|
| `shared/lib/` | 90%+ |
| `features/*/schemas/` | **100%** (境界値含む) |
| `features/*/api/` | 70%+ (queries/endpoints) |
| `features/*/components/` | 主要コンテナ + フォーム (leaf 表示は最低限) |
| `shared/ui/` | カスタムしたもののみ (shadcn 素のものはスキップ) |
| **全体** | **60%+** (初期目標、徐々に引き上げ) |

### 3-9. 実行コマンド
```bash
# Vitest
npm test                  # watch
npm run test:run          # 1 回実行
npm run test:coverage     # カバレッジ付き
npm run test -- deck      # パスフィルタ

# Playwright
npm run e2e               # E2E 全実行
npm run e2e:ui            # UI モード
npm run e2e -- --project=mobile
```

---

## 4. テストコードの保守

### 4-1. Flaky テストは即修正
不安定なテストは **即座に修正** する。「たまに落ちる」は許容しない。
- 時刻依存: Carbon::setTestNow() / vi.useFakeTimers()
- 非同期: `await waitFor(...)` or `findBy*` を使う
- 順序依存: テスト間で共有状態を持たない

### 4-2. モックは最小限
- 外部依存 (HTTP, DB) はモック
- 内部の実装詳細 (private methods 等) をモックしない
- モックだらけのテストは設計の悪臭

### 4-3. テスト用 helper を共通化
- バックエンド: `tests/TestCase.php` に共通メソッド
- フロント: `src/test/render.tsx` (Providers でラップした render)、`src/test/msw/` (handlers)

---

## 5. CI 運用

### 5-1. 現状
- `.github/workflows/ci.yml` で PHPUnit 実行中
- フロントエンドは script が存在すれば実行する条件付き

### 5-2. 目標 (本書 commit 後に設定)
- フロント: `npm test -- --run` を CI で必須実行
- E2E: `develop` / `main` への PR 時のみ実行 (時間節約)
- カバレッジレポートを Artifact として保存
- 将来: Codecov / SonarCloud で可視化

### 5-3. 失敗閾値
- **PR**: テスト失敗 → ブロック (merge 不可)
- **カバレッジ**: CI gate として使わない (初期段階)。数字だけ表示。

---

## 6. PR チェックリスト

- [ ] 新規 feature / resource にはテストがある
- [ ] バグ修正には回帰テストがある
- [ ] `npm test -- --run` が通る
- [ ] `docker compose exec backend php artisan test` が通る
- [ ] Flaky なテストを追加していない
- [ ] 実装の詳細ではなく、振る舞いをテストしている
- [ ] テスト名が読める (日本語 OK)
- [ ] モックが最小限
- [ ] E2E を書いた場合、モバイル/デスクトップ両方で実行される

---

## 7. Skills との関係

- **`api-new-resource`**: Feature Test と Unit Test の雛形を必ず生成する
- **`api-new-service`**: Interface モックを使った Unit Test を生成
- **`ui-new-feature`**: schema の Unit Test 雛形を生成
- **`ui-new-component`**: Container / Form 類は Component Test 雛形を生成
- **`api-review` / `ui-review`**: テストの有無・品質を観点に含む

各 skill の SKILL.md は本書を正典として参照する。
