<?php

declare(strict_types=1);

namespace Tests\Unit\Services\AI;

use App\Services\AI\CandidateQualityValidator;
use PHPUnit\Framework\TestCase;

final class CandidateQualityValidatorTest extends TestCase
{
    public function test_同じ問いを正規化して重複排除する(): void
    {
        $result = (new CandidateQualityValidator)->validate([
            ['question' => 'DI とは何か?', 'answer' => '依存性注入', 'card_type' => 'basic_qa'],
            ['question' => 'DIとは何か？', 'answer' => 'Dependency Injection', 'card_type' => 'basic_qa'],
        ]);

        $this->assertCount(1, $result);
    }

    public function test_答え露出と長文回答を警告する(): void
    {
        $answer = '依存性注入'.str_repeat('を説明する長い回答', 12);

        $result = (new CandidateQualityValidator)->validate([
            [
                'question' => $answer.'とは何か?',
                'answer' => $answer,
                'card_type' => 'basic_qa',
            ],
        ]);

        $this->assertContains('answer_exposed_in_question', $result[0]['quality_warnings']);
        $this->assertContains('answer_too_long', $result[0]['quality_warnings']);
    }

    public function test_clozeの答え不一致を警告する(): void
    {
        $result = (new CandidateQualityValidator)->validate([
            [
                'question' => 'RFID は {{c1::非接触}} 型の技術',
                'answer' => '電磁波',
                'card_type' => 'cloze_like',
            ],
        ]);

        $this->assertContains('cloze_answer_mismatch', $result[0]['quality_warnings']);
    }

    public function test_保存済み候補と同じ問いを除外する(): void
    {
        $result = (new CandidateQualityValidator)->excludeExistingQuestions([
            ['question' => ' DI とは何ですか？ '],
            ['question' => 'IoC とは何ですか？'],
        ], [
            'DIとは何ですか?',
        ]);

        $this->assertCount(1, $result);
        $this->assertSame('IoC とは何ですか？', $result[0]['question']);
    }

    public function test_問題文を正規化したsha256_fingerprintを返す(): void
    {
        $validator = new CandidateQualityValidator;

        $this->assertSame(
            $validator->fingerprint('DIとは何ですか?'),
            $validator->fingerprint(' DI とは何ですか？ '),
        );
        $this->assertNull($validator->fingerprint('  '));
    }
}
