<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

use App\Models\AiGenerationLog;

/**
 * 同一メモに対して既に進行中 (queued/processing) の生成ジョブが存在するときに throw する。
 * 同時生成によるコスト二重発生 / 結果の混線を防ぐ。
 */
final class GenerationAlreadyInFlightException extends DomainException
{
    public function __construct(
        public readonly AiGenerationLog $existingLog,
    ) {
        parent::__construct("Generation already in flight for note seed {$existingLog->note_seed_id}");
    }

    public function statusCode(): int
    {
        return 409;
    }

    public function userMessage(): string
    {
        return 'このメモはすでに生成中です。完了をお待ちください。';
    }

    public function errorCode(): ?string
    {
        return 'ALREADY_IN_FLIGHT';
    }
}
