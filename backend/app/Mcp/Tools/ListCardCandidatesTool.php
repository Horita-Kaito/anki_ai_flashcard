<?php

declare(strict_types=1);

namespace App\Mcp\Tools;

use App\Contracts\Repositories\AiCardCandidateRepositoryInterface;
use App\Enums\CandidateStatus;
use App\Exceptions\Domain\NoteSeedNotFoundException;
use App\Models\AiCardCandidate;
use App\Services\NoteSeedService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Validation\Rule;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Tool;

final class ListCardCandidatesTool extends Tool
{
    protected string $name = 'list_card_candidates';

    protected string $description = 'List flashcard candidates for a note, optionally filtered by status '
        .'(pending / adopted / rejected).';

    public function __construct(
        private readonly NoteSeedService $noteSeedService,
        private readonly AiCardCandidateRepositoryInterface $candidateRepository,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'note_seed_id' => $schema->integer()->required()
                ->description('The note whose candidates to list.'),
            'status' => $schema->string()->enum(array_column(CandidateStatus::cases(), 'value'))
                ->description('Optional status filter.'),
        ];
    }

    public function handle(Request $request): ResponseFactory|Response
    {
        $userId = (int) $request->user()->getAuthIdentifier();

        $validated = $request->validate([
            'note_seed_id' => ['required', 'integer'],
            'status' => ['sometimes', Rule::in(array_column(CandidateStatus::cases(), 'value'))],
        ]);

        try {
            $this->noteSeedService->getForUser($userId, $validated['note_seed_id']);
        } catch (NoteSeedNotFoundException $e) {
            return Response::error($e->getMessage());
        }

        $candidates = $this->candidateRepository->listForNoteSeed(
            $userId,
            $validated['note_seed_id'],
            $validated['status'] ?? null,
        );

        return Response::structured([
            'note_seed_id' => $validated['note_seed_id'],
            'total' => $candidates->count(),
            'candidates' => $candidates->map(static fn (AiCardCandidate $candidate): array => [
                'candidate_id' => $candidate->id,
                'question' => $candidate->question,
                'answer' => $candidate->answer,
                'card_type' => $candidate->card_type->value,
                'explanation' => $candidate->explanation,
                'confidence' => $candidate->confidence,
                'status' => $candidate->status->value,
                'suggested_deck_id' => $candidate->suggested_deck_id,
                'provider' => $candidate->provider,
            ])->values()->all(),
        ]);
    }
}
