<?php

declare(strict_types=1);

namespace Tests\Feature\Mcp;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class McpEndpointAuthTest extends TestCase
{
    use RefreshDatabase;

    private const TOOLS_LIST_PAYLOAD = [
        'jsonrpc' => '2.0',
        'id' => 1,
        'method' => 'tools/list',
    ];

    private const EXPECTED_TOOLS = [
        'capture_note',
        'propose_card_candidates',
        'generate_card_candidates',
        'list_card_candidates',
        'adopt_card_candidate',
        'list_decks',
        'list_due_cards',
        'answer_review',
    ];

    public function test_未認証ではツール一覧を取得できない(): void
    {
        $this->postJson('/mcp', self::TOOLS_LIST_PAYLOAD, [
            'Accept' => 'application/json, text/event-stream',
        ])->assertUnauthorized();
    }

    public function test_bearerトークンでツール一覧を取得できる(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('mcp-test')->plainTextToken;

        $response = $this->postJson('/mcp', self::TOOLS_LIST_PAYLOAD, [
            'Accept' => 'application/json, text/event-stream',
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertOk();

        $names = collect($response->json('result.tools'))->pluck('name')->all();
        foreach (self::EXPECTED_TOOLS as $tool) {
            $this->assertContains($tool, $names);
        }
        $this->assertCount(count(self::EXPECTED_TOOLS), $names);
    }
}
