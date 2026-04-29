<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

final class TokenControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_正しい認証情報で_tokenを発行できる(): void
    {
        User::factory()->create([
            'email' => 'native@example.com',
            'password' => Hash::make('password123'),
        ]);

        $response = $this->postJson('/api/v1/tokens', [
            'email' => 'native@example.com',
            'password' => 'password123',
            'device_name' => 'my-iphone',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.email', 'native@example.com')
            ->assertJsonStructure(['data', 'token']);

        $this->assertDatabaseHas('personal_access_tokens', ['name' => 'my-iphone']);
    }

    public function test_誤った認証情報で401を返す(): void
    {
        User::factory()->create([
            'email' => 'native@example.com',
            'password' => Hash::make('password123'),
        ]);

        $response = $this->postJson('/api/v1/tokens', [
            'email' => 'native@example.com',
            'password' => 'wrong',
            'device_name' => 'my-iphone',
        ]);

        $response->assertStatus(401);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_存在しないユーザーで401を返す(): void
    {
        $response = $this->postJson('/api/v1/tokens', [
            'email' => 'nobody@example.com',
            'password' => 'password123',
            'device_name' => 'my-iphone',
        ]);

        $response->assertStatus(401);
    }

    public function test_device_name未指定で422を返す(): void
    {
        User::factory()->create([
            'email' => 'native@example.com',
            'password' => Hash::make('password123'),
        ]);

        $response = $this->postJson('/api/v1/tokens', [
            'email' => 'native@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['device_name']);
    }

    public function test_発行された_tokenで_bearer認証して_me_にアクセスできる(): void
    {
        $user = User::factory()->create([
            'email' => 'native@example.com',
            'password' => Hash::make('password123'),
        ]);

        $issue = $this->postJson('/api/v1/tokens', [
            'email' => 'native@example.com',
            'password' => 'password123',
            'device_name' => 'my-iphone',
        ])->assertCreated();

        $token = $issue->json('token');

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/me');

        $response->assertOk()->assertJsonPath('data.id', $user->id);
    }

    public function test_tokens_currentでログイン_tokenをrevokeできる(): void
    {
        User::factory()->create([
            'email' => 'native@example.com',
            'password' => Hash::make('password123'),
        ]);

        $token = $this->postJson('/api/v1/tokens', [
            'email' => 'native@example.com',
            'password' => 'password123',
            'device_name' => 'my-iphone',
        ])->json('token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson('/api/v1/tokens/current')
            ->assertNoContent();

        $this->assertDatabaseCount('personal_access_tokens', 0);

        // 認証ガードのキャッシュを破棄してから再リクエスト (テスト環境のみ必要)
        $this->app['auth']->forgetGuards();

        // revoke 後は同じ Token で 401
        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/me')
            ->assertStatus(401);
    }

    public function test_logoutでも_bearer_tokenがrevokeされる(): void
    {
        User::factory()->create([
            'email' => 'native@example.com',
            'password' => Hash::make('password123'),
        ]);

        $token = $this->postJson('/api/v1/tokens', [
            'email' => 'native@example.com',
            'password' => 'password123',
            'device_name' => 'my-iphone',
        ])->json('token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/logout')
            ->assertNoContent();

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_tokens_indexで自分の_token一覧を取得できる(): void
    {
        $user = User::factory()->create([
            'email' => 'native@example.com',
            'password' => Hash::make('password123'),
        ]);
        $other = User::factory()->create();
        $other->createToken('other-device');

        $token = $this->postJson('/api/v1/tokens', [
            'email' => 'native@example.com',
            'password' => 'password123',
            'device_name' => 'my-iphone',
        ])->json('token');

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/tokens');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'my-iphone');

        // 他ユーザーの Token 名は含まれない
        $names = collect($response->json('data'))->pluck('name')->all();
        $this->assertNotContains('other-device', $names);
    }

    public function test_tokens発行はthrottle_5_1で制限される(): void
    {
        // throttle 状態を初期化
        RateLimiter::clear('login');
        // Throttle middleware は IP/route ベースで複数キーを使うので、安全に flush
        $this->app['cache']->getStore()->flush();

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/tokens', [
                'email' => 'nobody@example.com',
                'password' => 'wrong',
                'device_name' => 'x',
            ])->assertStatus(401);
        }

        // 6 回目で 429
        $this->postJson('/api/v1/tokens', [
            'email' => 'nobody@example.com',
            'password' => 'wrong',
            'device_name' => 'x',
        ])->assertStatus(429);
    }
}
