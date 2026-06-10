<?php

declare(strict_types=1);

namespace App\Mcp\Tools;

use App\Exceptions\Domain\AiUsageLimitExceededException;
use App\Exceptions\Domain\GenerationAlreadyInFlightException;
use App\Exceptions\Domain\NoteSeedNotFoundException;
use App\Services\CardGenerationService;
use App\Services\NoteSeedService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\Rule;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Tool;

final class GenerateCardCandidatesTool extends Tool
{
    /**
     * HTTP 側の throttle:ai-generation と同じバケットを共有する。
     * ThrottleRequests は名前付きリミッターのキーを md5(name.key) で導出し、
     * ai-generation の key は user id (AppServiceProvider の ->by())。
     */
    private const LIMITER_NAME = 'ai-generation';

    private const MAX_ATTEMPTS_PER_HOUR = 60;

    private const DECAY_SECONDS = 3600;

    protected string $name = 'generate_card_candidates';

    protected string $description = 'Ask the Tessera server-side AI to generate flashcard candidates from a note. '
        .'Runs asynchronously: poll list_card_candidates for results. Subject to an hourly rate limit.';

    public function __construct(
        private readonly NoteSeedService $noteSeedService,
        private readonly CardGenerationService $generationService,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'note_seed_id' => $schema->integer()->required()
                ->description('The note to generate candidates from.'),
            'domain_template_id' => $schema->integer()
                ->description('Optional domain template id owned by the user.'),
        ];
    }

    public function handle(Request $request): ResponseFactory|Response
    {
        $userId = (int) $request->user()->getAuthIdentifier();

        $validated = $request->validate([
            'note_seed_id' => ['required', 'integer'],
            'domain_template_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('domain_templates', 'id')->where('user_id', $userId),
            ],
        ]);

        $limiterKey = md5(self::LIMITER_NAME.$userId);

        if (RateLimiter::tooManyAttempts($limiterKey, self::MAX_ATTEMPTS_PER_HOUR)) {
            $seconds = RateLimiter::availableIn($limiterKey);

            return Response::error("AI generation rate limit reached. Retry in {$seconds} seconds.");
        }

        try {
            $note = $this->noteSeedService->getForUser($userId, $validated['note_seed_id']);

            $log = $this->generationService->dispatchGeneration($note, [
                'domain_template_id' => $validated['domain_template_id'] ?? null,
                'regenerate' => false,
                'additional' => false,
            ]);
        } catch (NoteSeedNotFoundException|AiUsageLimitExceededException|GenerationAlreadyInFlightException $e) {
            // 失敗はレート制限に計上しない (HTTP 側の after コールバックと同じ方針)
            return Response::error($e->getMessage());
        }

        RateLimiter::hit($limiterKey, self::DECAY_SECONDS);

        return Response::structured([
            'generation_log_id' => $log->id,
            'status' => $log->status,
            'hint' => 'Generation is asynchronous. Poll list_card_candidates with this note_seed_id to see results.',
        ]);
    }
}
