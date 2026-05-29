<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Chat\MaterializeChatNotesRequest;
use App\Http\Requests\Chat\SendChatMessageRequest;
use App\Http\Requests\Chat\StoreChatSessionRequest;
use App\Http\Resources\ChatMessageResource;
use App\Http\Resources\ChatSessionResource;
use App\Http\Resources\NoteSeedResource;
use App\Services\ChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ChatController extends Controller
{
    public function __construct(
        private readonly ChatService $chatService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) $request->integer('per_page', 20), 50);
        $sessions = $this->chatService->paginateForUser(
            userId: $request->user()->id,
            perPage: $perPage,
        );

        return ChatSessionResource::collection($sessions)->response();
    }

    public function store(StoreChatSessionRequest $request): JsonResponse
    {
        $session = $this->chatService->createForUser(
            userId: $request->user()->id,
            attributes: $request->validated(),
        );

        return (new ChatSessionResource($session))->response()->setStatusCode(201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $session = $this->chatService->getForUser(
            userId: $request->user()->id,
            chatSessionId: $id,
        );

        return (new ChatSessionResource($session))->response();
    }

    public function sendMessage(SendChatMessageRequest $request, int $id): JsonResponse
    {
        $result = $this->chatService->sendMessage(
            userId: $request->user()->id,
            chatSessionId: $id,
            content: $request->validated('content'),
        );

        return response()->json([
            'data' => [
                'user_message' => (new ChatMessageResource($result['user_message']))->toArray($request),
                'assistant_message' => (new ChatMessageResource($result['assistant_message']))->toArray($request),
            ],
        ], 201);
    }

    public function materializeNotes(MaterializeChatNotesRequest $request, int $id): JsonResponse
    {
        $result = $this->chatService->materializeNotesAndGenerate(
            userId: $request->user()->id,
            chatSessionId: $id,
            options: $request->validated(),
        );

        return response()->json([
            'data' => [
                'notes' => NoteSeedResource::collection(collect($result['notes']))->toArray($request),
                'dispatched' => $result['dispatched'],
                'skipped' => $result['skipped'],
                'failed' => $result['failed'],
                'chat_session_deleted' => $result['chat_session_deleted'],
            ],
        ], 202);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->chatService->deleteForUser(
            userId: $request->user()->id,
            chatSessionId: $id,
        );

        return response()->json(null, 204);
    }
}
