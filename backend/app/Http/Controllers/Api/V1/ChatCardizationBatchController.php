<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ChatCardizationBatchResource;
use App\Services\ChatCardizationBatchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ChatCardizationBatchController extends Controller
{
    public function __construct(
        private readonly ChatCardizationBatchService $batchService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) $request->integer('per_page', 10), 20);
        $batches = $this->batchService->paginateForUser(
            userId: $request->user()->id,
            perPage: $perPage,
        );

        return ChatCardizationBatchResource::collection($batches)->response();
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $batch = $this->batchService->getForUser(
            userId: $request->user()->id,
            batchId: $id,
        );

        return (new ChatCardizationBatchResource($batch))->response();
    }
}
