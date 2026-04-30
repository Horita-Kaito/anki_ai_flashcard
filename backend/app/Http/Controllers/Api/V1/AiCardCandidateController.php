<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Repositories\AiCardCandidateRepositoryInterface;
use App\Contracts\Repositories\AiGenerationLogRepositoryInterface;
use App\Http\Controllers\Controller;
use App\Http\Requests\AiCardCandidate\AdoptCandidateRequest;
use App\Http\Requests\AiCardCandidate\BatchAdoptRequest;
use App\Http\Requests\AiCardCandidate\GenerateCandidatesRequest;
use App\Http\Requests\AiCardCandidate\UpdateCandidateRequest;
use App\Http\Resources\AiCardCandidateResource;
use App\Http\Resources\AiGenerationStatusResource;
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

    /**
     * 生成ジョブをディスパッチして 202 Accepted を返す (実生成は worker 側で非同期実行)。
     */
    public function generate(
        GenerateCandidatesRequest $request,
        int $noteSeedId,
        bool $regenerate = false,
        bool $additional = false,
    ): JsonResponse {
        $note = $this->noteSeedService->getForUser(
            userId: $request->user()->id,
            noteSeedId: $noteSeedId,
        );

        $options = $request->validated();
        $options['regenerate'] = $regenerate;
        $options['additional'] = $additional;

        $log = $this->generationService->dispatchGeneration($note, $options);

        return (new AiGenerationStatusResource($log))
            ->response()
            ->setStatusCode(202);
    }

    public function regenerate(GenerateCandidatesRequest $request, int $noteSeedId): JsonResponse
    {
        return $this->generate($request, $noteSeedId, regenerate: true);
    }

    /**
     * pending 候補を温存したまま追加で候補を生成する。
     * 既存候補の question をプロンプトに渡して重複を回避する。
     */
    public function addMore(GenerateCandidatesRequest $request, int $noteSeedId): JsonResponse
    {
        return $this->generate($request, $noteSeedId, additional: true);
    }

    /**
     * 指定メモの最新生成ジョブの状態を返す。
     * - 進行中 (queued/processing) があればそれ
     * - なければ最後に完了した log
     * - 一度も生成されていなければ status=idle
     */
    public function generationStatus(Request $request, int $noteSeedId): JsonResponse
    {
        $note = $this->noteSeedService->getForUser(
            userId: $request->user()->id,
            noteSeedId: $noteSeedId,
        );

        /** @var AiGenerationLogRepositoryInterface $repo */
        $repo = app(AiGenerationLogRepositoryInterface::class);

        $log = $repo->findInFlightForNote($note->user_id, $note->id)
            ?? $repo->findLatestForNote($note->user_id, $note->id);

        if ($log === null) {
            return response()->json([
                'data' => [
                    'note_seed_id' => $note->id,
                    'status' => 'idle',
                ],
            ]);
        }

        return (new AiGenerationStatusResource($log))->response();
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
            scheduler: $validated['scheduler'] ?? null,
        );

        return response()->json([
            'data' => [
                'adopted_count' => count($cards),
                'cards' => CardResource::collection(collect($cards))->toArray($request),
            ],
        ], 201);
    }
}
