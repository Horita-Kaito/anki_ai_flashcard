<?php

declare(strict_types=1);

namespace Tests\Unit\Services\AI;

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

        $this->assertCount(2, $result);
        $this->assertSame('Q1', $result[0]['question']);
        $this->assertSame('comparison', $result[1]['card_type']);
    }

    public function test_コードフェンスに囲まれた_j_s_o_nも抽出できる(): void
    {
        $raw = "以下が生成結果です:\n```json\n".json_encode(['candidates' => [
            ['question' => 'Q', 'answer' => 'A', 'card_type' => 'basic_qa'],
        ]])."\n```\n以上です";

        $result = $this->parser->parse($raw);

        $this->assertCount(1, $result);
    }

    public function test_不正な_j_s_o_nは空配列を返す(): void
    {
        $this->assertSame([], $this->parser->parse('not json'));
        $this->assertSame([], $this->parser->parse(''));
    }

    public function test_question空の候補は除外される(): void
    {
        $json = json_encode(['candidates' => [
            ['question' => '', 'answer' => 'A', 'card_type' => 'basic_qa'],
            ['question' => 'Q', 'answer' => '', 'card_type' => 'basic_qa'],
            ['question' => 'Q2', 'answer' => 'A2', 'card_type' => 'basic_qa'],
        ]]);

        $this->assertCount(1, $this->parser->parse($json));
    }

    public function test_不正な_card_typeはbasic_qaにフォールバック(): void
    {
        $json = json_encode(['candidates' => [
            ['question' => 'Q', 'answer' => 'A', 'card_type' => 'invalid'],
        ]]);

        $result = $this->parser->parse($json);

        $this->assertSame('basic_qa', $result[0]['card_type']);
    }

    public function test_confidenceは0から1にクランプされる(): void
    {
        $json = json_encode(['candidates' => [
            ['question' => 'Q', 'answer' => 'A', 'card_type' => 'basic_qa', 'confidence' => 1.5],
            ['question' => 'Q', 'answer' => 'A', 'card_type' => 'basic_qa', 'confidence' => -0.5],
        ]]);

        $result = $this->parser->parse($json);

        $this->assertSame(1.0, $result[0]['confidence']);
        $this->assertSame(0.0, $result[1]['confidence']);
    }
}
