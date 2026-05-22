<?php

declare(strict_types=1);

namespace Tests\Unit\Services\AI;

use App\Services\AI\ChunkSplitter;
use PHPUnit\Framework\TestCase;

final class ChunkSplitterTest extends TestCase
{
    public function test_短文メモは分割せず1チャンクで返す(): void
    {
        $splitter = new ChunkSplitter();
        $body = '短いメモ。あまり情報量はない。';

        $chunks = $splitter->split($body);

        $this->assertCount(1, $chunks);
        $this->assertSame($body, $chunks[0]);
    }

    public function test_空文字は空文字1件を返す(): void
    {
        $splitter = new ChunkSplitter();

        $this->assertSame([''], $splitter->split(''));
        $this->assertSame([''], $splitter->split('   '));
    }

    public function test_skip閾値未満なら見出しがあっても分割しない(): void
    {
        // skipSplitThreshold=1500 のデフォルトなので、それ未満は分割対象外
        $splitter = new ChunkSplitter();
        $body = "# 章1\n短い本文1\n\n# 章2\n短い本文2";

        $chunks = $splitter->split($body);

        $this->assertCount(1, $chunks);
    }

    public function test_長文メモはMarkdown見出しで分割される(): void
    {
        $splitter = new ChunkSplitter(
            minChunkSize: 50,
            maxChunkSize: 5000,
            skipSplitThreshold: 100,
        );
        $body = "# 第1章\n".str_repeat('内容A', 30)."\n\n# 第2章\n".str_repeat('内容B', 30);

        $chunks = $splitter->split($body);

        $this->assertCount(2, $chunks);
        $this->assertStringStartsWith('# 第1章', $chunks[0]);
        $this->assertStringStartsWith('# 第2章', $chunks[1]);
    }

    public function test_長文メモはハイフン区切り線で分割され区切り線自体は捨てられる(): void
    {
        $splitter = new ChunkSplitter(
            minChunkSize: 50,
            maxChunkSize: 5000,
            skipSplitThreshold: 100,
        );
        $body = str_repeat('セクション前半', 30)."\n\n---\n\n".str_repeat('セクション後半', 30);

        $chunks = $splitter->split($body);

        $this->assertCount(2, $chunks);
        $this->assertStringNotContainsString('---', $chunks[0]);
        $this->assertStringNotContainsString('---', $chunks[1]);
    }

    public function test_見出しのない長文メモは空行2連続で分割される(): void
    {
        $splitter = new ChunkSplitter(
            minChunkSize: 50,
            maxChunkSize: 5000,
            skipSplitThreshold: 100,
        );
        $body = str_repeat('段落A', 30)."\n\n\n".str_repeat('段落B', 30);

        $chunks = $splitter->split($body);

        $this->assertCount(2, $chunks);
        $this->assertStringContainsString('段落A', $chunks[0]);
        $this->assertStringContainsString('段落B', $chunks[1]);
        // 空行は次 chunk の先頭に持ち越されない
        $this->assertStringStartsWith('段落B', $chunks[1]);
    }

    public function test_minChunkSize未満のチャンクは次のチャンクと結合される(): void
    {
        $splitter = new ChunkSplitter(
            minChunkSize: 200,
            maxChunkSize: 5000,
            skipSplitThreshold: 100,
        );
        // 30 字 + 200 字 → 最初の chunk が min=200 未満なので結合される
        $body = "# 小\n".str_repeat('あ', 30)."\n\n# 大\n".str_repeat('い', 200);

        $chunks = $splitter->split($body);

        $this->assertCount(1, $chunks);
        $this->assertStringContainsString('# 小', $chunks[0]);
        $this->assertStringContainsString('# 大', $chunks[0]);
    }

    public function test_maxChunkSizeを超えるチャンクは文字数で強制カットされる(): void
    {
        $splitter = new ChunkSplitter(
            minChunkSize: 50,
            maxChunkSize: 500,
            skipSplitThreshold: 100,
        );
        // 句点なしの長文 (区切れがないので max でハードカット)
        $body = str_repeat('あ', 1200);

        $chunks = $splitter->split($body);

        $this->assertGreaterThanOrEqual(2, count($chunks));
        foreach ($chunks as $c) {
            $this->assertLessThanOrEqual(500, mb_strlen($c));
        }
    }

    public function test_強制カット時は句点が優先される(): void
    {
        $splitter = new ChunkSplitter(
            minChunkSize: 50,
            maxChunkSize: 300,
            skipSplitThreshold: 100,
        );
        // 句点 → ここで切れて欲しい
        $body = str_repeat('あ', 280).'。'.str_repeat('い', 280).'。';

        $chunks = $splitter->split($body);

        $this->assertGreaterThanOrEqual(2, count($chunks));
        // 最初の chunk が句点で終わっていること
        $this->assertStringEndsWith('。', $chunks[0]);
    }

    public function test_見出し階層は1から3レベルすべて境界とみなす(): void
    {
        $splitter = new ChunkSplitter(
            minChunkSize: 50,
            maxChunkSize: 5000,
            skipSplitThreshold: 100,
        );
        $body = "# H1\n".str_repeat('a', 60)."\n## H2\n".str_repeat('b', 60)."\n### H3\n".str_repeat('c', 60);

        $chunks = $splitter->split($body);

        $this->assertCount(3, $chunks);
        $this->assertStringStartsWith('# H1', $chunks[0]);
        $this->assertStringStartsWith('## H2', $chunks[1]);
        $this->assertStringStartsWith('### H3', $chunks[2]);
    }

    public function test_見出しと区切り線と空行が混在しても全て境界として処理される(): void
    {
        $splitter = new ChunkSplitter(
            minChunkSize: 50,
            maxChunkSize: 5000,
            skipSplitThreshold: 100,
        );
        $body = "# A\n".str_repeat('a', 80)
            ."\n\n---\n\n".str_repeat('b', 80)
            ."\n\n\n".str_repeat('c', 80)
            ."\n\n# D\n".str_repeat('d', 80);

        $chunks = $splitter->split($body);

        $this->assertCount(4, $chunks);
    }

    public function test_長文ベタ書きメモも段落境界か文字数で分割される(): void
    {
        $splitter = new ChunkSplitter();
        // 1500 字以上の長文ベタ書き (見出しも --- もなし)
        $body = str_repeat('これはサンプル文章です。', 200);

        $chunks = $splitter->split($body);

        $this->assertGreaterThanOrEqual(2, count($chunks));
        foreach ($chunks as $c) {
            $this->assertLessThanOrEqual(2500, mb_strlen($c));
        }
    }

    public function test_全体結合が元の本文と概ね一致する(): void
    {
        $splitter = new ChunkSplitter(
            minChunkSize: 50,
            maxChunkSize: 5000,
            skipSplitThreshold: 100,
        );
        $body = "# 章1\n".str_repeat('A', 60)."\n\n# 章2\n".str_repeat('B', 60);

        $chunks = $splitter->split($body);

        // chunk を結合すると元の内容を概ね保持する (区切り線や空行の除去は別途)
        $joined = implode('', $chunks);
        $this->assertStringContainsString('# 章1', $joined);
        $this->assertStringContainsString('# 章2', $joined);
        $this->assertStringContainsString(str_repeat('A', 60), $joined);
        $this->assertStringContainsString(str_repeat('B', 60), $joined);
    }
}
