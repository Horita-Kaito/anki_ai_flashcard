<?php

declare(strict_types=1);

namespace App\Mcp\Tools;

use App\Models\Deck;
use App\Services\DeckService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Tool;

final class ListDecksTool extends Tool
{
    protected string $name = 'list_decks';

    protected string $description = 'List the user\'s decks (with hierarchy paths). '
        .'Use this to let the user choose a deck before adopting candidates or filtering reviews.';

    public function __construct(
        private readonly DeckService $deckService,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function schema(JsonSchema $schema): array
    {
        return [];
    }

    public function handle(Request $request): ResponseFactory
    {
        $userId = (int) $request->user()->getAuthIdentifier();

        $decks = $this->deckService->allWithTreeMetaForUser($userId);

        return Response::structured([
            'total' => $decks->count(),
            'decks' => $decks->map(static fn (Deck $deck): array => [
                'deck_id' => $deck->id,
                'name' => $deck->name,
                'parent_id' => $deck->parent_id,
                'path' => implode(' / ', $deck->path ?? [$deck->name]),
            ])->values()->all(),
        ]);
    }
}
