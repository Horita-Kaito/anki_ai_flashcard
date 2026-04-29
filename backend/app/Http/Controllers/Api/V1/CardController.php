<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Repositories\TagRepositoryInterface;
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
        private readonly TagRepositoryInterface $tagRepository,
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
            $tagId = (int) $request->query('tag_id');
            // 他ユーザーの tag_id を渡された場合は無視 (空結果オラクルでの存在列挙を防ぐ)
            if ($this->tagRepository->findForUser($request->user()->id, $tagId) !== null) {
                $filters['tag_id'] = $tagId;
            }
        }
        if ($request->filled('q')) {
            $filters['q'] = (string) $request->query('q');
        }
        if ($request->filled('archived')) {
            $filters['archived'] = filter_var($request->query('archived'), FILTER_VALIDATE_BOOLEAN);
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

    public function archive(Request $request, int $id): JsonResponse
    {
        $card = $this->cardService->archiveForUser(
            userId: $request->user()->id,
            cardId: $id,
        );

        return (new CardResource($card))->response();
    }

    public function unarchive(Request $request, int $id): JsonResponse
    {
        $card = $this->cardService->unarchiveForUser(
            userId: $request->user()->id,
            cardId: $id,
        );

        return (new CardResource($card))->response();
    }
}
