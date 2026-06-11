<?php

declare(strict_types=1);

namespace App\Mcp\Tools;

use App\Exceptions\Domain\AiCardCandidateNotAdoptableException;
use App\Exceptions\Domain\AiCardCandidateNotFoundException;
use App\Exceptions\Domain\DeckNotFoundException;
use App\Services\AiCardCandidateService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Validation\Rule;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Tool;

final class AdoptCardCandidateTool extends Tool
{
    protected string $name = 'adopt_card_candidate';

    protected string $description = 'Adopt a pending candidate into a study card. Only call this after the user '
        .'has explicitly approved the candidate and chosen a deck in this conversation. '
        .'Use list_decks to let the user pick a deck.';

    public function __construct(
        private readonly AiCardCandidateService $candidateService,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'candidate_id' => $schema->integer()->required()
                ->description('The pending candidate to adopt.'),
            'deck_id' => $schema->integer()->required()
                ->description('Deck to add the card to (must be chosen by the user).'),
            'question' => $schema->string()->max(2000)
                ->description('Optional edited question (defaults to the candidate text).'),
            'answer' => $schema->string()->max(2000)
                ->description('Optional edited answer.'),
            'explanation' => $schema->string()->max(5000)
                ->description('Optional edited explanation.'),
        ];
    }

    public function handle(Request $request): ResponseFactory|Response
    {
        $userId = (int) $request->user()->getAuthIdentifier();

        $validated = $request->validate([
            'candidate_id' => ['required', 'integer'],
            'deck_id' => [
                'required',
                'integer',
                Rule::exists('decks', 'id')->where('user_id', $userId),
            ],
            'question' => ['sometimes', 'string', 'max:2000'],
            'answer' => ['sometimes', 'string', 'max:2000'],
            'explanation' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);

        $candidateId = $validated['candidate_id'];
        unset($validated['candidate_id']);

        try {
            $card = $this->candidateService->adoptForUser($userId, $candidateId, $validated);
        } catch (AiCardCandidateNotFoundException|AiCardCandidateNotAdoptableException|DeckNotFoundException $e) {
            return Response::error($e->getMessage());
        }

        return Response::structured([
            'card_id' => $card->id,
            'deck_id' => $card->deck_id,
            'question' => $card->question,
            'answer' => $card->answer,
            'candidate_status' => 'adopted',
        ]);
    }
}
