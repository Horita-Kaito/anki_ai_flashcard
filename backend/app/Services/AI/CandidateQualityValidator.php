<?php

declare(strict_types=1);

namespace App\Services\AI;

use App\Contracts\Services\AI\CandidateQualityValidatorInterface;

final class CandidateQualityValidator implements CandidateQualityValidatorInterface
{
    /**
     * @param  array<int, array<string, mixed>>  $candidates
     * @return array<int, array<string, mixed>>
     */
    public function validate(array $candidates): array
    {
        $validated = [];
        $seenQuestions = [];

        foreach ($candidates as $candidate) {
            $questionKey = $this->normalize((string) $candidate['question']);
            if ($questionKey === '' || isset($seenQuestions[$questionKey])) {
                continue;
            }
            $seenQuestions[$questionKey] = true;

            $warnings = [];
            $question = (string) $candidate['question'];
            $answer = (string) $candidate['answer'];
            $cardType = (string) $candidate['card_type'];

            if ($cardType !== 'cloze_like' && $this->containsAnswer($question, $answer)) {
                $warnings[] = 'answer_exposed_in_question';
            }
            if (mb_strlen($answer) > 80) {
                $warnings[] = 'answer_too_long';
            }
            if ($cardType === 'cloze_like' && ! $this->clozeContainsAnswer($question, $answer)) {
                $warnings[] = 'cloze_answer_mismatch';
            }

            $candidate['quality_warnings'] = $warnings;
            $validated[] = $candidate;
        }

        return $validated;
    }

    public function excludeExistingQuestions(array $candidates, array $existingQuestions): array
    {
        $existingKeys = collect($existingQuestions)
            ->map(fn (string $question): string => $this->normalize($question))
            ->filter()
            ->flip();

        return collect($candidates)
            ->reject(fn (array $candidate): bool => $existingKeys->has(
                $this->normalize((string) $candidate['question'])
            ))
            ->values()
            ->all();
    }

    public function fingerprint(string $question): ?string
    {
        $normalized = $this->normalize($question);

        return $normalized === '' ? null : hash('sha256', $normalized);
    }

    private function containsAnswer(string $question, string $answer): bool
    {
        $normalizedAnswer = $this->normalize($answer);

        return mb_strlen($normalizedAnswer) >= 2
            && str_contains($this->normalize($question), $normalizedAnswer);
    }

    private function clozeContainsAnswer(string $question, string $answer): bool
    {
        if (! preg_match_all('/\{\{c\d+::([^}]+)\}\}/u', $question, $matches)) {
            return false;
        }

        $answerKey = $this->normalize($answer);

        return collect($matches[1])
            ->contains(fn (string $cloze): bool => $this->normalize($cloze) === $answerKey);
    }

    private function normalize(string $value): string
    {
        return mb_strtolower((string) preg_replace('/[\s[:punct:]]+/u', '', trim($value)));
    }
}
