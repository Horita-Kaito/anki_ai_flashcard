<?php

declare(strict_types=1);

namespace App\Mcp\Tools;

use App\Enums\ReviewRating;
use App\Exceptions\Domain\CardNotFoundException;
use App\Exceptions\Domain\CardNotReviewableException;
use App\Services\ReviewSessionService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Validation\Rule;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Tool;

final class AnswerReviewTool extends Tool
{
    protected string $name = 'answer_review';

    protected string $description = 'Record the user\'s self-rated review result for a card '
        .'(again / hard / good / easy). Updates the spaced-repetition schedule.';

    public function __construct(
        private readonly ReviewSessionService $reviewSessionService,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'card_id' => $schema->integer()->required()
                ->description('The reviewed card.'),
            'rating' => $schema->string()->enum(ReviewRating::values())->required()
                ->description('The user\'s self-rating.'),
            'response_time_ms' => $schema->integer()->min(0)->max(3600000)
                ->description('Optional time the user took to answer, in milliseconds (max 1 hour).'),
        ];
    }

    public function handle(Request $request): ResponseFactory|Response
    {
        $userId = (int) $request->user()->getAuthIdentifier();

        $validated = $request->validate([
            'card_id' => ['required', 'integer'],
            'rating' => ['required', 'string', Rule::in(ReviewRating::values())],
            'response_time_ms' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:3600000'],
        ]);

        try {
            $result = $this->reviewSessionService->recordAnswer(
                $userId,
                $validated['card_id'],
                ReviewRating::from($validated['rating']),
                $validated['response_time_ms'] ?? null,
            );
        } catch (CardNotFoundException|CardNotReviewableException $e) {
            return Response::error($e->getMessage());
        }

        $schedule = $result['schedule'];

        return Response::structured([
            'card_id' => $result['card']->id,
            'rating' => $validated['rating'],
            'next_due_at' => $schedule->due_at?->toIso8601String(),
            'interval_days' => $schedule->interval_days,
            'state' => $schedule->state,
        ]);
    }
}
