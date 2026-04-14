<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\NoteSeed\StoreNoteSeedRequest;
use App\Http\Requests\NoteSeed\UpdateNoteSeedRequest;
use App\Http\Resources\NoteSeedResource;
use App\Services\NoteSeedService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class NoteSeedController extends Controller
{
    public function __construct(
        private readonly NoteSeedService $noteSeedService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', '20');
        $perPage = max(1, min($perPage, 100));

        $filters = [];
        if ($request->filled('domain_template_id')) {
            $filters['domain_template_id'] = (int) $request->query('domain_template_id');
        }
        if ($request->filled('q')) {
            $filters['q'] = (string) $request->query('q');
        }

        $notes = $this->noteSeedService->paginateForUser(
            userId: $request->user()->id,
            filters: $filters,
            perPage: $perPage,
        );

        return NoteSeedResource::collection($notes)->response();
    }

    public function store(StoreNoteSeedRequest $request): JsonResponse
    {
        $note = $this->noteSeedService->createForUser(
            userId: $request->user()->id,
            attributes: $request->validated(),
        );

        return (new NoteSeedResource($note))->response()->setStatusCode(201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $note = $this->noteSeedService->getForUser(
            userId: $request->user()->id,
            noteSeedId: $id,
        );

        return (new NoteSeedResource($note))->response();
    }

    public function update(UpdateNoteSeedRequest $request, int $id): JsonResponse
    {
        $note = $this->noteSeedService->updateForUser(
            userId: $request->user()->id,
            noteSeedId: $id,
            attributes: $request->validated(),
        );

        return (new NoteSeedResource($note))->response();
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->noteSeedService->deleteForUser(
            userId: $request->user()->id,
            noteSeedId: $id,
        );

        return response()->json(null, 204);
    }
}
