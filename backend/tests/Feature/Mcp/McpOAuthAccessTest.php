<?php

declare(strict_types=1);

namespace Tests\Feature\Mcp;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Tests\TestCase;

final class McpOAuthAccessTest extends TestCase
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

    public function test_mcp_useスコープの_o_authトークンでツール一覧を取得できる(): void
    {
        Passport::actingAs(User::factory()->create(), ['mcp:use']);

        $this->postJson('/mcp', self::TOOLS_LIST_PAYLOAD, self::MCP_HEADERS)
            ->assertOk()
            ->assertJsonPath('result.tools.0.name', 'capture_note');
    }

    public function test_スコープなしの_o_authトークンは403になる(): void
    {
        Passport::actingAs(User::factory()->create(), []);

        $this->postJson('/mcp', self::TOOLS_LIST_PAYLOAD, self::MCP_HEADERS)
            ->assertForbidden();
    }

    public function test_o_authトークンでもデータは自ユーザーにスコープされる(): void
    {
        $user = User::factory()->create();
        Passport::actingAs($user, ['mcp:use']);

        $response = $this->postJson('/mcp', [
            'jsonrpc' => '2.0',
            'id' => 2,
            'method' => 'tools/call',
            'params' => [
                'name' => 'capture_note',
                'arguments' => ['content' => 'OAuth経由の保存テスト'],
            ],
        ], self::MCP_HEADERS);

        $response->assertOk();

        $this->assertDatabaseHas('note_seeds', [
            'user_id' => $user->id,
            'body' => 'OAuth経由の保存テスト',
        ]);
    }
}
