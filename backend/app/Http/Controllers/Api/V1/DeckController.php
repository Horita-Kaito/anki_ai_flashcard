<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Deck\StoreDeckRequest;
use App\Http\Requests\Deck\UpdateDeckRequest;
use App\Http\Requests\Deck\UpdateDeckTreeRequest;
use App\Http\Resources\DeckResource;
use App\Services\DeckService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class DeckController extends Controller
{
    public function __construct(
        private readonly DeckService $deckService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $decks = $this->deckService->allWithTreeMetaForUser(
            userId: $request->user()->id,
        );

        return DeckResource::collection($decks)->response();
    }

    public function store(StoreDeckRequest $request): JsonResponse
    {
        $deck = $this->deckService->createForUser(
            userId: $request->user()->id,
            attributes: $request->validated(),
        );

        return (new DeckResource($deck))->response()->setStatusCode(201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $deck = $this->deckService->getForUser(
            userId: $request->user()->id,
            deckId: $id,
        );

        return (new DeckResource($deck))->response();
    }

    public function update(UpdateDeckRequest $request, int $id): JsonResponse
    {
        $deck = $this->deckService->updateForUser(
            userId: $request->user()->id,
            deckId: $id,
            attributes: $request->validated(),
        );

        return (new DeckResource($deck))->response();
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->deckService->deleteForUser(
            userId: $request->user()->id,
            deckId: $id,
        );

        return response()->json(null, 204);
    }

    /**
     * 階層 + 並び順の一括更新 (ドラッグ DnD 後)。
     * reorder は廃止し、本エンドポイントに統合。
     */
    public function updateTree(UpdateDeckTreeRequest $request): JsonResponse
    {
        /** @var array<int, array{id: int, parent_id: ?int, display_order: int}> $nodes */
        $nodes = $request->validated('nodes');

        $this->deckService->updateTreeForUser(
            userId: $request->user()->id,
            nodes: $nodes,
        );

        return response()->json(null, 204);
    }
}
