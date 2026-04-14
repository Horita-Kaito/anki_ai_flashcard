<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Deck\StoreDeckRequest;
use App\Http\Requests\Deck\UpdateDeckRequest;
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
        $perPage = (int) $request->query('per_page', '20');
        $perPage = max(1, min($perPage, 100));

        $decks = $this->deckService->paginateForUser(
            userId: $request->user()->id,
            perPage: $perPage,
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
}
