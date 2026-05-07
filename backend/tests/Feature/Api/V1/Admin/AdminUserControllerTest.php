<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

final class AdminUserControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('admin.emails', ['admin@example.com']);
    }

    public function test_未認証では401(): void
    {
        $this->postJson('/api/v1/admin/users', [
            'name' => 'k-yamamoto',
            'email' => 'k-yamamoto@example.com',
        ])->assertUnauthorized();
    }

    public function test_管理者でない場合は403(): void
    {
        $user = User::factory()->create(['email' => 'normal@example.com']);

        $this->actingAs($user)
            ->postJson('/api/v1/admin/users', [
                'name' => 'k-yamamoto',
                'email' => 'k-yamamoto@example.com',
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('users', ['email' => 'k-yamamoto@example.com']);
    }

    public function test_管理者ならユーザーを作成できる(): void
    {
        $admin = User::factory()->create(['email' => 'admin@example.com']);

        $response = $this->actingAs($admin)
            ->postJson('/api/v1/admin/users', [
                'name' => 'k-yamamoto',
                'email' => 'k-yamamoto@example.com',
            ]);

        $response->assertCreated()
            ->assertJsonStructure([
                'data' => [
                    'user' => ['id', 'name', 'email', 'created_at', 'updated_at'],
                    'generated_password',
                ],
            ])
            ->assertJsonPath('data.user.email', 'k-yamamoto@example.com')
            ->assertJsonPath('data.user.name', 'k-yamamoto');

        $generatedPassword = $response->json('data.generated_password');
        $this->assertIsString($generatedPassword);
        $this->assertGreaterThanOrEqual(16, strlen($generatedPassword));

        $this->assertDatabaseHas('users', [
            'email' => 'k-yamamoto@example.com',
            'name' => 'k-yamamoto',
        ]);

        $created = User::where('email', 'k-yamamoto@example.com')->firstOrFail();
        $this->assertTrue(Hash::check($generatedPassword, $created->password));
    }

    public function test_メールアドレスの大文字小文字に関わらず管理者判定される(): void
    {
        config()->set('admin.emails', ['admin@example.com']);

        $admin = User::factory()->create(['email' => 'Admin@Example.com']);

        $this->actingAs($admin)
            ->postJson('/api/v1/admin/users', [
                'name' => 'k-yamamoto',
                'email' => 'k-yamamoto@example.com',
            ])
            ->assertCreated();
    }

    public function test_重複メールアドレスは422(): void
    {
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        User::factory()->create(['email' => 'taken@example.com']);

        $this->actingAs($admin)
            ->postJson('/api/v1/admin/users', [
                'name' => 'k-yamamoto',
                'email' => 'taken@example.com',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_必須項目欠落は422(): void
    {
        $admin = User::factory()->create(['email' => 'admin@example.com']);

        $this->actingAs($admin)
            ->postJson('/api/v1/admin/users', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email']);
    }
}
