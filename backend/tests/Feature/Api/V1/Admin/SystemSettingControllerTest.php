<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1\Admin;

use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class SystemSettingControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('admin.emails', ['admin@example.com']);
    }

    public function test_未認証では401(): void
    {
        $this->getJson('/api/v1/admin/system-settings')->assertUnauthorized();
    }

    public function test_管理者でない場合はshowで403(): void
    {
        $user = User::factory()->create(['email' => 'normal@example.com']);

        $this->actingAs($user)
            ->getJson('/api/v1/admin/system-settings')
            ->assertForbidden();
    }

    public function test_管理者でない場合はupdateで403(): void
    {
        $user = User::factory()->create(['email' => 'normal@example.com']);

        $this->actingAs($user)
            ->putJson('/api/v1/admin/system-settings', ['monthly_token_limit' => 100000])
            ->assertForbidden();
    }

    public function test_管理者は現在の設定を取得できる(): void
    {
        $admin = User::factory()->create(['email' => 'admin@example.com']);

        $this->actingAs($admin)
            ->getJson('/api/v1/admin/system-settings')
            ->assertOk()
            ->assertJsonStructure([
                'data' => ['monthly_token_limit', 'created_at', 'updated_at'],
            ]);
    }

    public function test_管理者は月次トークン上限を更新できる(): void
    {
        $admin = User::factory()->create(['email' => 'admin@example.com']);

        $this->actingAs($admin)
            ->putJson('/api/v1/admin/system-settings', ['monthly_token_limit' => 500000])
            ->assertOk()
            ->assertJsonPath('data.monthly_token_limit', 500000);

        $this->assertDatabaseHas('system_settings', [
            'id' => SystemSetting::SINGLETON_ID,
            'monthly_token_limit' => 500000,
        ]);
    }

    public function test_管理者はnullを送って無制限に戻せる(): void
    {
        SystemSetting::query()->updateOrCreate(
            ['id' => SystemSetting::SINGLETON_ID],
            ['monthly_token_limit' => 100000],
        );
        $admin = User::factory()->create(['email' => 'admin@example.com']);

        $this->actingAs($admin)
            ->putJson('/api/v1/admin/system-settings', ['monthly_token_limit' => null])
            ->assertOk()
            ->assertJsonPath('data.monthly_token_limit', null);
    }

    public function test_最小値未満は422(): void
    {
        $admin = User::factory()->create(['email' => 'admin@example.com']);

        $this->actingAs($admin)
            ->putJson('/api/v1/admin/system-settings', ['monthly_token_limit' => 100])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['monthly_token_limit']);
    }

    public function test_文字列は422(): void
    {
        $admin = User::factory()->create(['email' => 'admin@example.com']);

        $this->actingAs($admin)
            ->putJson('/api/v1/admin/system-settings', ['monthly_token_limit' => 'unlimited'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['monthly_token_limit']);
    }
}
