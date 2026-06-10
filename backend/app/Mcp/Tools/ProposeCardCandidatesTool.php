<?php

declare(strict_types=1);

namespace App\Mcp\Tools;

use App\Enums\CardType;
use App\Exceptions\Domain\NoteSeedNotFoundException;
use App\Models\AiCardCandidate;
use App\Services\ExternalCardProposalService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Validation\Rule;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Tool;

final class ProposeCardCandidatesTool extends Tool
{
    protected string $name = 'propose_card_candidates';

    protected string $description = 'Submit flashcard drafts you authored as *pending candidates* for human review. '
        .'They are NOT study cards yet: the user reviews and adopts them in Tessera (or via adopt_card_candidate '
        .'after explicit approval in this conversation). Attach them to an existing note via note_seed_id, '
        .'or pass note_content to create a new note.';

    public function __construct(
        private readonly ExternalCardProposalService $proposalService,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'note_seed_id' => $schema->integer()
                ->description('Existing note to attach candidates to. Exactly one of note_seed_id / note_content is required.'),
            'note_content' => $schema->string()->max(5000)
                ->description('Create a new note with this body and attach candidates to it.'),
            'candidates' => $schema->array()->min(1)->max(20)->required()
                ->items($schema->object([
                    'question' => $schema->string()->max(2000)->required(),
                    'answer' => $schema->string()->max(2000)->required()
                        ->description('Keep answers short (~80 chars) for effective recall.'),
                    'card_type' => $schema->string()->enum(CardType::values()),
                    'explanation' => $schema->string()->max(5000)
                        ->description('Optional supplementary explanation shown after answering.'),
                ]))
                ->description('Flashcard drafts (1-20).'),
            'model_name' => $schema->string()->max(100)
                ->description('Your own model name, for provenance (e.g. "claude-fable-5").'),
        ];
    }

    public function handle(Request $request): ResponseFactory|Response
    {
        $userId = (int) $request->user()->getAuthIdentifier();

        $validated = $request->validate([
            'note_seed_id' => ['required_without:note_content', 'prohibits:note_content', 'integer'],
            'note_content' => ['required_without:note_seed_id', 'string', 'max:5000'],
            'candidates' => ['required', 'array', 'min:1', 'max:20'],
            'candidates.*.question' => ['required', 'string', 'max:2000'],
            'candidates.*.answer' => ['required', 'string', 'max:2000'],
            'candidates.*.card_type' => ['sometimes', Rule::in(CardType::values())],
            'candidates.*.explanation' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'model_name' => ['sometimes', 'string', 'max:100'],
        ]);

        try {
            $result = $this->proposalService->proposeForUser(
                userId: $userId,
                noteSeedId: $validated['note_seed_id'] ?? null,
                noteContent: $validated['note_content'] ?? null,
                drafts: $validated['candidates'],
                modelName: $validated['model_name'] ?? 'unknown',
            );
        } catch (NoteSeedNotFoundException $e) {
            return Response::error($e->getMessage());
        }

        return Response::structured([
            'note_seed_id' => $result['note_seed']->id,
            'created' => array_map(static fn (AiCardCandidate $candidate): array => [
                'candidate_id' => $candidate->id,
                'question' => $candidate->question,
                'status' => $candidate->status->value,
            ], $result['created']),
            'skipped_duplicates' => $result['skipped_duplicates'],
            'hint' => 'Candidates are pending. The user reviews them in Tessera, or you may call '
                .'adopt_card_candidate only after the user explicitly approves a candidate here.',
        ]);
    }
}
