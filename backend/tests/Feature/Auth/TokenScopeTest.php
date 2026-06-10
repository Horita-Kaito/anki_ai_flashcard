<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class TokenScopeTest extends TestCase
{
    use RefreshDatabase;

    private const MCP_HEADERS = [
        'Accept' => 'application/json, text/event-stream',
    ];

    private const TOOLS_LIST_PAYLOAD = [
        'jsonrpc' => '2.0',
        'id' => 1,
        'method' => 'tools/list',
    ];

    public function test_scope指定なしのトークンはフルアクセスで発行される(): void
    {
        $user = User::factory()->create(['password' => bcrypt('password-123')]);

        $this->postJson('/api/v1/tokens', [
            'email' => $user->email,
            'password' => 'password-123',
            'device_name' => 'ios-app',
        ])->assertCreated();

        $this->assertSame(['*'], $user->tokens()->first()->abilities);
    }

    public function test_mcp_scopeで発行するとmcp_use_abilityのみになる(): void
    {
        $user = User::factory()->create(['password' => bcrypt('password-123')]);

        $this->postJson('/api/v1/tokens', [
            'email' => $user->email,
            'password' => 'password-123',
            'device_name' => 'claude-mcp',
            'scope' => 'mcp',
        ])->assertCreated();

        $this->assertSame(['mcp:use'], $user->tokens()->first()->abilities);
    }

    public function test_mcp専用トークンは_res_t_ap_iにアクセスできない(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('mcp-only', ['mcp:use'])->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/decks')
            ->assertForbidden();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/me')
            ->assertForbidden();
    }

    public function test_mcp専用トークンは_mc_pエンドポイントにアクセスできる(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('mcp-only', ['mcp:use'])->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/mcp', self::TOOLS_LIST_PAYLOAD, self::MCP_HEADERS)
            ->assertOk();
    }

    public function test_フルトークンは_res_tと_mc_pの両方にアクセスできる(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('full', ['*'])->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/me')
            ->assertOk();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/mcp', self::TOOLS_LIST_PAYLOAD, self::MCP_HEADERS)
            ->assertOk();
    }

    public function test_sp_aセッション認証はabilitiesチェックの影響を受けない(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/v1/me')
            ->assertOk();
    }

    public function test_認証済みならパスワードなしでトークンを発行できる(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/api/v1/tokens/issue', [
                'device_name' => 'settings-ui',
                'scope' => 'mcp',
            ]);

        $response->assertCreated()
            ->assertJsonStructure(['data' => ['id', 'name', 'abilities'], 'token']);

        $this->assertSame(['mcp:use'], $user->tokens()->first()->abilities);
    }

    public function test_未認証ではtokens_issueを呼べない(): void
    {
        $this->postJson('/api/v1/tokens/issue', ['device_name' => 'x'])
            ->assertUnauthorized();
    }

    public function test_自分のトークンを_i_d指定で失効できる(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('to-revoke');

        $this->actingAs($user)
            ->deleteJson("/api/v1/tokens/{$token->accessToken->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $token->accessToken->id,
        ]);
    }

    public function test_他ユーザーのトークンは失効できない(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $othersToken = $other->createToken('others');

        $this->actingAs($user)
            ->deleteJson("/api/v1/tokens/{$othersToken->accessToken->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('personal_access_tokens', [
            'id' => $othersToken->accessToken->id,
        ]);
    }

    public function test_トークン一覧にabilitiesが含まれる(): void
    {
        $user = User::factory()->create();
        $user->createToken('mcp-token', ['mcp:use']);

        $this->actingAs($user)
            ->getJson('/api/v1/tokens')
            ->assertOk()
            ->assertJsonPath('data.0.abilities', ['mcp:use']);
    }
}
