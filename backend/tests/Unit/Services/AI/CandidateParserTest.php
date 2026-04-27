<?php

declare(strict_types=1);

namespace Tests\Unit\Services\AI;

use App\Exceptions\Domain\AiGenerationFailedException;
use App\Services\AI\CandidateParser;
use PHPUnit\Framework\TestCase;

final class CandidateParserTest extends TestCase
{
    private CandidateParser $parser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->parser = new CandidateParser;
    }

    public function test_正常な_j_s_o_n配列をパースできる(): void
    {
        $json = json_encode(['candidates' => [
            ['question' => 'Q1', 'answer' => 'A1', 'card_type' => 'basic_qa'],
            ['question' => 'Q2', 'answer' => 'A2', 'card_type' => 'comparison'],
        ]]);

        $result = $this->parser->parse($json);

        $this->assertFalse($result->truncated);
        $this->assertCount(2, $result->items);
        $this->assertSame('Q1', $result->items[0]['question']);
        $this->assertSame('comparison', $result->items[1]['card_type']);
    }

    public function test_コードフェンスに囲まれた_j_s_o_nも抽出できる(): void
    {
        $raw = "以下が生成結果です:\n```json\n".json_encode(['candidates' => [
            ['question' => 'Q', 'answer' => 'A', 'card_type' => 'basic_qa'],
        ]])."\n```\n以上です";

        $result = $this->parser->parse($raw);

        $this->assertCount(1, $result->items);
        $this->assertFalse($result->truncated);
    }

    public function test_完全に空の応答は例外(): void
    {
        $this->expectException(AiGenerationFailedException::class);
        $this->parser->parse('');
    }

    public function test_j_s_o_nではない応答は例外で詳細を含む(): void
    {
        try {
            $this->parser->parse('not json at all');
            $this->fail('expected exception');
        } catch (AiGenerationFailedException $e) {
            $this->assertSame(
                AiGenerationFailedException::CODE_INVALID_RESPONSE,
                $e->errorCode(),
            );
            $this->assertNotNull($e->debugDetail());
        }
    }

    public function test_question空の候補は除外される(): void
    {
        $json = json_encode(['candidates' => [
            ['question' => '', 'answer' => 'A', 'card_type' => 'basic_qa'],
            ['question' => 'Q', 'answer' => '', 'card_type' => 'basic_qa'],
            ['question' => 'Q2', 'answer' => 'A2', 'card_type' => 'basic_qa'],
        ]]);

        $result = $this->parser->parse($json);

        $this->assertCount(1, $result->items);
    }

    public function test_不正な_card_typeはbasic_qaにフォールバック(): void
    {
        $json = json_encode(['candidates' => [
            ['question' => 'Q', 'answer' => 'A', 'card_type' => 'invalid'],
        ]]);

        $result = $this->parser->parse($json);

        $this->assertSame('basic_qa', $result->items[0]['card_type']);
    }

    public function test_confidenceは0から1にクランプされる(): void
    {
        $json = json_encode(['candidates' => [
            ['question' => 'Q', 'answer' => 'A', 'card_type' => 'basic_qa', 'confidence' => 1.5],
            ['question' => 'Q', 'answer' => 'A', 'card_type' => 'basic_qa', 'confidence' => -0.5],
        ]]);

        $result = $this->parser->parse($json);

        $this->assertSame(1.0, $result->items[0]['confidence']);
        $this->assertSame(0.0, $result->items[1]['confidence']);
    }

    public function test_explanationをパースできる(): void
    {
        $json = json_encode(['candidates' => [
            [
                'question' => 'Q',
                'answer' => 'A',
                'card_type' => 'basic_qa',
                'explanation' => '[生物] 晴れた日の葉で起きる反応',
            ],
            [
                'question' => 'Q2',
                'answer' => 'A2',
                'card_type' => 'basic_qa',
            ],
        ]]);

        $result = $this->parser->parse($json);

        $this->assertSame('[生物] 晴れた日の葉で起きる反応', $result->items[0]['explanation']);
        $this->assertNull($result->items[1]['explanation']);
    }

    public function test_末尾切れ_j_s_o_nから完成済み要素を部分復元できる(): void
    {
        // 3件目の途中で切れた状態 (max_output_tokens 到達想定)
        $truncated = '{"candidates":['
            .'{"question":"Q1","answer":"A1","card_type":"basic_qa"},'
            .'{"question":"Q2","answer":"A2","card_type":"basic_qa"},'
            .'{"question":"Q3","answer":"A3","card_';

        $result = $this->parser->parse($truncated);

        $this->assertTrue($result->truncated);
        $this->assertCount(2, $result->items);
        $this->assertSame('Q1', $result->items[0]['question']);
        $this->assertSame('Q2', $result->items[1]['question']);
        $this->assertNotNull($result->debugDetail);
    }

    public function test_切り詰めで1件も復元できなければ_max_tokens相当の例外(): void
    {
        // 1件目の途中で切れていて完成オブジェクトがない
        $truncated = '{"candidates":[{"question":"Q1","answer":"A1","card_';

        try {
            $this->parser->parse($truncated);
            $this->fail('expected exception');
        } catch (AiGenerationFailedException $e) {
            $this->assertSame(
                AiGenerationFailedException::CODE_JSON_TRUNCATED,
                $e->errorCode(),
            );
        }
    }

    public function test_文字列内の波括弧をオブジェクト境界と誤認しない(): void
    {
        // explanation 内に閉じ括弧 } や開き括弧 { が含まれる cloze っぽいケース
        $json = '{"candidates":['
            .'{"question":"穴埋め: {{c1::光合成}} は植物の反応?","answer":"光合成","card_type":"cloze_like","explanation":"{} 内が答え"}'
            .']}';

        $result = $this->parser->parse($json);

        $this->assertFalse($result->truncated);
        $this->assertCount(1, $result->items);
        $this->assertSame('光合成', $result->items[0]['answer']);
    }
}
