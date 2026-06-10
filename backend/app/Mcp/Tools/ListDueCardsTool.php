<?php

declare(strict_types=1);

namespace App\Mcp\Tools;

use App\Models\CardSchedule;
use App\Services\ReviewSessionService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Validation\Rule;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Tool;

final class ListDueCardsTool extends Tool
{
    protected string $name = 'list_due_cards';

    protected string $description = 'Fetch cards due for review. Quiz the user one card at a time: show the '
        .'question, let the user answer first, only then reveal the answer, and record the user\'s '
        .'self-rating with answer_review.';

    public function __construct(
        private readonly ReviewSessionService $reviewSessionService,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'deck_id' => $schema->integer()
                ->description('Optional deck filter (includes descendant decks).'),
            'limit' => $schema->integer()->min(1)->max(50)->default(10)
                ->description('Max number of cards to fetch (default 10).'),
        ];
    }

    public function handle(Request $request): ResponseFactory
    {
        $userId = (int) $request->user()->getAuthIdentifier();

        $validated = $request->validate([
            'deck_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('decks', 'id')->where('user_id', $userId),
            ],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $schedules = $this->reviewSessionService->dueCardsForUser(
            $userId,
            $validated['deck_id'] ?? null,
            $validated['limit'] ?? 10,
        );

        return Response::structured([
            'total_returned' => count($schedules),
            'cards' => array_map(static fn (CardSchedule $schedule): array => [
                'card_id' => $schedule->card_id,
                'question' => $schedule->card->question,
                'answer' => $schedule->card->answer,
                'explanation' => $schedule->card->explanation,
                'deck_id' => $schedule->card->deck_id,
                'due_at' => $schedule->due_at?->toIso8601String(),
            ], $schedules),
            'hint' => 'Present one question at a time. Do not reveal the answer until the user attempts it. '
                .'Then call answer_review with the user\'s rating (again/hard/good/easy).',
        ]);
    }
}
