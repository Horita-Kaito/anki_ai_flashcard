<?php

declare(strict_types=1);

namespace Tests\Feature\Mcp;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class OAuthDiscoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_protected_resourceメタデータを取得できる(): void
    {
        $this->getJson('/.well-known/oauth-protected-resource')
            ->assertOk()
            ->assertJsonStructure(['resource', 'authorization_servers']);
    }

    public function test_authorization_serverメタデータを取得できる(): void
    {
        $this->getJson('/.well-known/oauth-authorization-server')
            ->assertOk()
            ->assertJsonStructure([
                'issuer',
                'authorization_endpoint',
                'token_endpoint',
                'registration_endpoint',
            ]);
    }

    public function test_許可ドメインなら動的クライアント登録できる(): void
    {
        $response = $this->postJson('/oauth/register', [
            'client_name' => 'Claude',
            'redirect_uris' => ['https://claude.ai/api/mcp/auth_callback'],
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['client_id', 'redirect_uris'])
            ->assertJsonPath('redirect_uris.0', 'https://claude.ai/api/mcp/auth_callback');

        $this->assertDatabaseHas('oauth_clients', ['name' => 'Claude']);
    }

    public function test_許可外ドメインの動的クライアント登録は拒否される(): void
    {
        // RFC 7591 形式のエラー (400 + error フィールド)
        $this->postJson('/oauth/register', [
            'client_name' => 'Evil',
            'redirect_uris' => ['https://evil.example.com/callback'],
        ])->assertBadRequest();

        $this->assertDatabaseMissing('oauth_clients', ['name' => 'Evil']);
    }

    public function test_カスタムスキームのリダイレクト_ur_iを許可できる(): void
    {
        $this->postJson('/oauth/register', [
            'client_name' => 'Claude Desktop',
            'redirect_uris' => ['claude://oauth/callback'],
        ])->assertCreated();
    }
}
