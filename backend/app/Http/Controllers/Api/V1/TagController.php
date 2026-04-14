<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Tag\StoreTagRequest;
use App\Http\Resources\TagResource;
use App\Services\TagService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class TagController extends Controller
{
    public function __construct(
        private readonly TagService $tagService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tags = $this->tagService->listForUser($request->user()->id);

        return TagResource::collection($tags)->response();
    }

    public function store(StoreTagRequest $request): JsonResponse
    {
        $tag = $this->tagService->findOrCreateForUser(
            userId: $request->user()->id,
            name: $request->string('name')->toString(),
        );

        return (new TagResource($tag))->response()->setStatusCode(201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->tagService->deleteForUser($request->user()->id, $id);

        return response()->json(null, 204);
    }
}
