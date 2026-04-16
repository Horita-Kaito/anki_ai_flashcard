<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Repositories\AiCardCandidateRepositoryInterface;
use App\Http\Controllers\Controller;
use App\Http\Requests\AiCardCandidate\AdoptCandidateRequest;
use App\Http\Requests\AiCardCandidate\BatchAdoptRequest;
use App\Http\Requests\AiCardCandidate\GenerateCandidatesRequest;
use App\Http\Requests\AiCardCandidate\UpdateCandidateRequest;
use App\Http\Resources\AiCardCandidateResource;
use App\Http\Resources\CardResource;
use App\Models\NoteSeed;
use App\Services\AiCardCandidateService;
use App\Services\CardGenerationService;
use App\Services\NoteSeedService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AiCardCandidateController extends Controller
{
    public function __construct(
        private readonly CardGenerationService $generationService,
        private readonly AiCardCandidateService $candidateService,
        private readonly NoteSeedService $noteSeedService,
    ) {}

    public function generate(
        GenerateCandidatesRequest $request,
        int $noteSeedId,
        bool $regenerate = false,
    ): JsonResponse {
        $note = $this->noteSeedService->getForUser(
            userId: $request->user()->id,
            noteSeedId: $noteSeedId,
        );

        $options = $request->validated();
        $options['regenerate'] = $regenerate;

        $candidates = $this->generationService->generate($note, $options);

        return AiCardCandidateResource::collection($candidates)
            ->response()
            ->setStatusCode(201);
    }

    public function regenerate(GenerateCandidatesRequest $request, int $noteSeedId): JsonResponse
    {
        return $this->generate($request, $noteSeedId, regenerate: true);
    }

    public function indexForNoteSeed(Request $request, int $noteSeedId): JsonResponse
    {
        /** @var NoteSeed $note */
        $note = $this->noteSeedService->getForUser(
            userId: $request->user()->id,
            noteSeedId: $noteSeedId,
        );

        $status = $request->query('status');
        $statusStr = is_string($status) && $status !== '' ? $status : null;

        /** @var AiCardCandidateRepositoryInterface $repo */
        $repo = app(AiCardCandidateRepositoryInterface::class);
        $candidates = $repo->listForNoteSeed($note->user_id, $note->id, $statusStr);

        return AiCardCandidateResource::collection($candidates)->response();
    }

    public function update(UpdateCandidateRequest $request, int $id): JsonResponse
    {
        $candidate = $this->candidateService->updateForUser(
            userId: $request->user()->id,
            candidateId: $id,
            attributes: $request->validated(),
        );

        return (new AiCardCandidateResource($candidate))->response();
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $candidate = $this->candidateService->rejectForUser(
            userId: $request->user()->id,
            candidateId: $id,
        );

        return (new AiCardCandidateResource($candidate))->response();
    }

    /**
     * 却下の取り消し (Undo)
     */
    public function restore(Request $request, int $id): JsonResponse
    {
        $candidate = $this->candidateService->restoreForUser(
            userId: $request->user()->id,
            candidateId: $id,
        );

        return (new AiCardCandidateResource($candidate))->response();
    }

    public function adopt(AdoptCandidateRequest $request, int $id): JsonResponse
    {
        $card = $this->candidateService->adoptForUser(
            userId: $request->user()->id,
            candidateId: $id,
            overrides: $request->validated(),
        );

        return (new CardResource($card))->response()->setStatusCode(201);
    }

    public function batchAdopt(BatchAdoptRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $cards = $this->candidateService->batchAdoptForUser(
            userId: $request->user()->id,
            candidateIds: $validated['candidate_ids'],
            deckId: (int) $validated['deck_id'],
            tagIds: $validated['tag_ids'] ?? [],
        );

        return response()->json([
            'data' => [
                'adopted_count' => count($cards),
                'cards' => CardResource::collection(collect($cards))->toArray($request),
            ],
        ], 201);
    }
}
