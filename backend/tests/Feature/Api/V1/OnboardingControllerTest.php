<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\DomainTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class OnboardingControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_未認証では401を返す(): void
    {
        $this->postJson('/api/v1/onboarding', ['goals' => ['programming']])
            ->assertUnauthorized();

        $this->getJson('/api/v1/onboarding/status')
            ->assertUnauthorized();
    }

    public function test_複数の目標でオンボーディングが完了する(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/v1/onboarding', [
            'goals' => ['programming', 'language'],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.templates', 2)
            ->assertJsonPath('data.decks', 2);

        // テンプレートが作成されている
        $this->assertDatabaseHas('domain_templates', [
            'user_id' => $user->id,
            'name' => 'プログラミング',
        ]);
        $this->assertDatabaseHas('domain_templates', [
            'user_id' => $user->id,
            'name' => '語学',
        ]);

        // デッキが作成されている
        $this->assertDatabaseHas('decks', [
            'user_id' => $user->id,
            'name' => 'プログラミング学習',
        ]);
        $this->assertDatabaseHas('decks', [
            'user_id' => $user->id,
            'name' => '語学学習',
        ]);

        // 目標固有のタグ + 共通タグが作成されている
        $this->assertDatabaseHas('tags', ['user_id' => $user->id, 'name' => 'コード']);
        $this->assertDatabaseHas('tags', ['user_id' => $user->id, 'name' => '設計パターン']);
        $this->assertDatabaseHas('tags', ['user_id' => $user->id, 'name' => '単語']);
        $this->assertDatabaseHas('tags', ['user_id' => $user->id, 'name' => '文法']);
        $this->assertDatabaseHas('tags', ['user_id' => $user->id, 'name' => '重要']);
        $this->assertDatabaseHas('tags', ['user_id' => $user->id, 'name' => '復習必須']);
        $this->assertDatabaseHas('tags', ['user_id' => $user->id, 'name' => '基礎']);

        // UserSetting が作成されている
        $this->assertDatabaseHas('user_settings', ['user_id' => $user->id]);

        // onboarding_completed_at がセットされている
        $user->refresh();
        $this->assertNotNull($user->onboarding_completed_at);
    }

    public function test_全ての目標で正しいテンプレートとデッキが作成される(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/v1/onboarding', [
            'goals' => ['programming', 'language', 'exam', 'math_science', 'business', 'other'],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.templates', 6)
            ->assertJsonPath('data.decks', 6);

        $this->assertDatabaseHas('decks', ['user_id' => $user->id, 'name' => 'プログラミング学習']);
        $this->assertDatabaseHas('decks', ['user_id' => $user->id, 'name' => '語学学習']);
        $this->assertDatabaseHas('decks', ['user_id' => $user->id, 'name' => '資格試験対策']);
        $this->assertDatabaseHas('decks', ['user_id' => $user->id, 'name' => '数学・理系']);
        $this->assertDatabaseHas('decks', ['user_id' => $user->id, 'name' => 'ビジネス・経営']);
        $this->assertDatabaseHas('decks', ['user_id' => $user->id, 'name' => '一般学習']);
    }

    public function test_オンボーディング済みの場合は409を返す(): void
    {
        $user = User::factory()->create([
            'onboarding_completed_at' => now(),
        ]);

        $response = $this->actingAs($user)->postJson('/api/v1/onboarding', [
            'goals' => ['programming'],
        ]);

        $response->assertStatus(409)
            ->assertJsonPath('message', 'オンボーディングは既に完了しています。');
    }

    public function test_goals未指定でバリデーションエラー(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/v1/onboarding', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['goals']);
    }

    public function test_空のgoals配列でバリデーションエラー(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/v1/onboarding', ['goals' => []])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['goals']);
    }

    public function test_無効なgoal値でバリデーションエラー(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/v1/onboarding', ['goals' => ['invalid_goal']])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['goals.0']);
    }

    public function test_オンボーディングステータスが取得できる(): void
    {
        $user = User::factory()->create();

        // 未完了
        $this->actingAs($user)
            ->getJson('/api/v1/onboarding/status')
            ->assertOk()
            ->assertJsonPath('data.completed', false);

        // 完了後
        $user->update(['onboarding_completed_at' => now()]);

        $this->actingAs($user)
            ->getJson('/api/v1/onboarding/status')
            ->assertOk()
            ->assertJsonPath('data.completed', true);
    }

    public function test_最初の目標のテンプレートがデフォルトに設定される(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/v1/onboarding', [
            'goals' => ['exam', 'programming'],
        ]);

        $examTemplate = DomainTemplate::where('user_id', $user->id)
            ->where('name', '資格試験')
            ->first();

        $this->assertDatabaseHas('user_settings', [
            'user_id' => $user->id,
            'default_domain_template_id' => $examTemplate->id,
        ]);
    }
}
