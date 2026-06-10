<?php

declare(strict_types=1);

namespace App\Mcp\Tools;

use App\Services\NoteSeedService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Tool;

final class CaptureNoteTool extends Tool
{
    protected string $name = 'capture_note';

    protected string $description = 'Save learning content from the conversation as a Tessera note (NoteSeed). '
        .'The note can later be turned into flashcard candidates.';

    public function __construct(
        private readonly NoteSeedService $noteSeedService,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'content' => $schema->string()->max(5000)->required()
                ->description('The note body. Summarize what the user wants to remember, in their language.'),
            'domain_template_id' => $schema->integer()
                ->description('Optional domain template id owned by the user.'),
            'subdomain' => $schema->string()->max(255)
                ->description('Optional subdomain/topic label.'),
            'learning_goal' => $schema->string()->max(1000)
                ->description('Optional learning goal for this note.'),
            'note_context' => $schema->string()->max(2000)
                ->description('Optional context, e.g. where this came up.'),
        ];
    }

    public function handle(Request $request): ResponseFactory
    {
        $userId = (int) $request->user()->getAuthIdentifier();

        $validated = $request->validate([
            'content' => ['required', 'string', 'max:5000'],
            'domain_template_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('domain_templates', 'id')->where('user_id', $userId),
            ],
            'subdomain' => ['sometimes', 'nullable', 'string', 'max:255'],
            'learning_goal' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'note_context' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        $validated['body'] = $validated['content'];
        unset($validated['content']);

        $note = $this->noteSeedService->createForUser($userId, $validated);

        return Response::structured([
            'note_seed_id' => $note->id,
            'body_preview' => Str::limit($note->body, 120),
            'created_at' => $note->created_at?->toIso8601String(),
            'hint' => 'Use generate_card_candidates or propose_card_candidates to turn this note into flashcards.',
        ]);
    }
}
