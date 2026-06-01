<?php

declare(strict_types=1);

namespace App\Contracts\Services\AI;

interface CandidateQualityValidatorInterface
{
    /**
     * @param  array<int, array<string, mixed>>  $candidates
     * @return array<int, array<string, mixed>>
     */
    public function validate(array $candidates): array;

    /**
     * @param  array<int, array<string, mixed>>  $candidates
     * @param  array<int, string>  $existingQuestions
     * @return array<int, array<string, mixed>>
     */
    public function excludeExistingQuestions(array $candidates, array $existingQuestions): array;

    public function fingerprint(string $question): ?string;
}
