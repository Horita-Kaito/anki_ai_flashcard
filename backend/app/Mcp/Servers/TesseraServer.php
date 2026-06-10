<?php

declare(strict_types=1);

namespace App\Mcp\Servers;

use App\Mcp\Tools\AdoptCardCandidateTool;
use App\Mcp\Tools\AnswerReviewTool;
use App\Mcp\Tools\CaptureNoteTool;
use App\Mcp\Tools\GenerateCardCandidatesTool;
use App\Mcp\Tools\ListCardCandidatesTool;
use App\Mcp\Tools\ListDecksTool;
use App\Mcp\Tools\ListDueCardsTool;
use App\Mcp\Tools\ProposeCardCandidatesTool;
use Laravel\Mcp\Server;

final class TesseraServer extends Server
{
    protected string $name = 'Tessera';

    protected string $version = '1.0.0';

    protected string $instructions = <<<'MARKDOWN'
    Tessera is a spaced-repetition flashcard app. All data you read or write
    belongs to the authenticated user only.

    Core flow: capture notes -> card candidates -> human review/adoption -> study.

    Rules you must follow:
    - Cards you draft via `propose_card_candidates` are saved as *pending
      candidates*. They become study cards only after the user explicitly asks
      to adopt them (use `adopt_card_candidate` with a deck chosen by the user).
      Never adopt candidates the user has not approved in this conversation.
    - When quizzing with `list_due_cards`, present one question at a time and do
      not reveal the answer until the user has attempted it. After the user
      grades themselves, record it with `answer_review`
      (rating: again / hard / good / easy).
    - `generate_card_candidates` runs asynchronously on the server. Poll
      `list_card_candidates` to see results.
    MARKDOWN;

    /** @var array<int, class-string> */
    protected array $tools = [
        CaptureNoteTool::class,
        ProposeCardCandidatesTool::class,
        GenerateCardCandidatesTool::class,
        ListCardCandidatesTool::class,
        AdoptCardCandidateTool::class,
        ListDecksTool::class,
        ListDueCardsTool::class,
        AnswerReviewTool::class,
    ];
}
