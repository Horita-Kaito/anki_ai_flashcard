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

            // 不整合 cloze (中身が answer と一致しない / 空) は穴埋めとして成立しない
            // (例: 「...の他に{{c1::何があるか}}?」のように疑問詞を cloze で包むパターン)。
            // 警告どまりだとレビューをすり抜けて壊れたカードになるため、cloze マーカーを
            // 除去して basic_qa に自動降格する。質問文自体は通常の問いとして成立する。
            if ($cardType === 'cloze_like' && ! $this->clozeContainsAnswer($question, $answer)) {
                $question = $this->stripClozeMarkers($question);
                $cardType = 'basic_qa';
                $candidate['question'] = $question;
                $candidate['card_type'] = $cardType;
                $warnings[] = 'cloze_downgraded_to_basic';
            }

            if ($cardType !== 'cloze_like' && $this->containsAnswer($question, $answer)) {
                $warnings[] = 'answer_exposed_in_question';
            }
            if (mb_strlen($answer) > 80) {
                $warnings[] = 'answer_too_long';
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

    /**
     * `{{cN::xxx}}` を `xxx` に置換する。空の cloze (`{{c1::}}`) は文が壊れないよう
     * 可視の空欄 `____` に置換する (basic_qa の穴埋め文として成立させる)。
     */
    private function stripClozeMarkers(string $question): string
    {
        return (string) preg_replace_callback(
            '/\{\{c\d+::([^}]*)\}\}/u',
            static fn (array $m): string => $m[1] !== '' ? $m[1] : '____',
            $question,
        );
    }
}
