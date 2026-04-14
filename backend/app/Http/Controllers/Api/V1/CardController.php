<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Card\StoreCardRequest;
use App\Http\Requests\Card\UpdateCardRequest;
use App\Http\Resources\CardResource;
use App\Services\CardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CardController extends Controller
{
    public function __construct(
        private readonly CardService $cardService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', '20');
        $perPage = max(1, min($perPage, 100));

        $filters = [];
        if ($request->filled('deck_id')) {
            $filters['deck_id'] = (int) $request->query('deck_id');
        }
        if ($request->filled('tag_id')) {
            $filters['tag_id'] = (int) $request->query('tag_id');
        }
        if ($request->filled('q')) {
            $filters['q'] = (string) $request->query('q');
        }

        $cards = $this->cardService->paginateForUser(
            userId: $request->user()->id,
            filters: $filters,
            perPage: $perPage,
        );

        return CardResource::collection($cards)->response();
    }

    public function store(StoreCardRequest $request): JsonResponse
    {
        $card = $this->cardService->createForUser(
            userId: $request->user()->id,
            attributes: $request->validated(),
        );

        return (new CardResource($card))->response()->setStatusCode(201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $card = $this->cardService->getForUser(
            userId: $request->user()->id,
            cardId: $id,
        );

        return (new CardResource($card))->response();
    }

    public function update(UpdateCardRequest $request, int $id): JsonResponse
    {
        $card = $this->cardService->updateForUser(
            userId: $request->user()->id,
            cardId: $id,
            attributes: $request->validated(),
        );

        return (new CardResource($card))->response();
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->cardService->deleteForUser(
            userId: $request->user()->id,
            cardId: $id,
        );

        return response()->json(null, 204);
    }
}
