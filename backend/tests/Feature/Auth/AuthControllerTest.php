<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

final class AuthControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_登録エンドポイントは廃止されている(): void
    {
        $response = $this->postJson('/api/v1/register', [
            'name' => '太郎',
            'email' => 'taro@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(404);
        $this->assertDatabaseMissing('users', ['email' => 'taro@example.com']);
    }

    public function test_正しい認証情報でログインできる(): void
    {
        User::factory()->create([
            'email' => 'login@example.com',
            'password' => Hash::make('password123'),
        ]);

        $response = $this->postJson('/api/v1/login', [
            'email' => 'login@example.com',
            'password' => 'password123',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.email', 'login@example.com');
    }

    public function test_誤った認証情報で401を返す(): void
    {
        User::factory()->create([
            'email' => 'login@example.com',
            'password' => Hash::make('password123'),
        ]);

        $response = $this->postJson('/api/v1/login', [
            'email' => 'login@example.com',
            'password' => 'wrong',
        ]);

        $response->assertStatus(401);
    }

    public function test_未認証では_me_が401を返す(): void
    {
        $this->getJson('/api/v1/me')->assertStatus(401);
    }

    public function test_認証済みでは_me_で自分の情報を取得できる(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/v1/me');

        $response->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email', $user->email);
    }

    public function test_meは管理者でない場合_is_admin_がfalse(): void
    {
        config()->set('admin.emails', ['admin@example.com']);
        $user = User::factory()->create(['email' => 'normal@example.com']);

        $this->actingAs($user)->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.is_admin', false);
    }

    public function test_meは管理者の場合_is_admin_がtrue(): void
    {
        config()->set('admin.emails', ['admin@example.com']);
        $admin = User::factory()->create(['email' => 'admin@example.com']);

        $this->actingAs($admin)->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.is_admin', true);
    }
}
