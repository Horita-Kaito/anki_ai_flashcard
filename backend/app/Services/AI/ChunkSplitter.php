<?php

declare(strict_types=1);

namespace App\Services\AI;

/**
 * メモ本文をカード生成しやすい単位に分割する純粋ロジック。
 *
 * 境界検出 (優先度順):
 *   1. Markdown 見出し行 (#, ##, ###) の直前
 *   2. 区切り線 (---) の前後 (区切り線自体は drop)
 *   3. 空行 2 連続以上 (段落境界)
 *
 * 上記境界で分割した chunk のサイズを正規化:
 *   - min 未満の chunk は隣と merge
 *   - max を超える chunk は文字数で強制カット (句点・改行優先)
 *
 * 全体が skipSplitThreshold 未満のメモは分割せず 1 chunk として返す。
 */
final class ChunkSplitter
{
    public function __construct(
        private readonly int $minChunkSize = 300,
        private readonly int $maxChunkSize = 2500,
        private readonly int $skipSplitThreshold = 1500,
    ) {}

    /**
     * @return array<int, string> 1 要素以上の chunk。空の入力は空文字 1 件を返す。
     */
    public function split(string $body): array
    {
        $trimmed = trim($body);
        if ($trimmed === '') {
            return [''];
        }

        if (mb_strlen($trimmed) < $this->skipSplitThreshold) {
            return [$trimmed];
        }

        $chunks = $this->findBoundaries($trimmed);
        $chunks = $this->mergeSmall($chunks);
        $chunks = $this->breakLarge($chunks);

        // 念のため空文字は捨てる (boundary 直後に空 chunk が残るケースを保険的に除去)
        $chunks = array_values(array_filter($chunks, fn (string $c): bool => trim($c) !== ''));

        return $chunks === [] ? [$trimmed] : $chunks;
    }

    /**
     * @return array<int, string>
     */
    private function findBoundaries(string $body): array
    {
        $lines = preg_split("/\r\n|\r|\n/", $body) ?: [];
        $chunks = [];
        $current = [];
        $blankRun = 0;
        $flush = function () use (&$chunks, &$current): void {
            if ($current === []) {
                return;
            }
            $chunk = trim(implode("\n", $current));
            if ($chunk !== '') {
                $chunks[] = $chunk;
            }
            $current = [];
        };

        foreach ($lines as $line) {
            $trimLine = trim($line);
            $isHeading = preg_match('/^#{1,3}\s/', $line) === 1;
            $isHr = preg_match('/^-{3,}\s*$/', $trimLine) === 1;
            $isBlank = $trimLine === '';

            if ($isHr) {
                // --- 区切り線: 直前で切り、線自体は捨てる
                $flush();
                $blankRun = 0;

                continue;
            }

            if ($isHeading) {
                // 見出しの直前で切る (見出し行は次の chunk の先頭になる)
                $flush();
                $blankRun = 0;
                $current[] = $line;

                continue;
            }

            if ($isBlank) {
                $blankRun++;
                if ($blankRun >= 2) {
                    // 空行 2 連続で段落境界とみなす
                    $flush();

                    continue;
                }
                // 空行 1 行は段落内の改行として温存
                $current[] = $line;

                continue;
            }

            $blankRun = 0;
            $current[] = $line;
        }

        $flush();

        return $chunks;
    }

    /**
     * minChunkSize 未満の chunk を隣と結合する。
     *
     * @param  array<int, string>  $chunks
     * @return array<int, string>
     */
    private function mergeSmall(array $chunks): array
    {
        if ($chunks === []) {
            return $chunks;
        }

        $out = [];
        foreach ($chunks as $chunk) {
            if ($out !== [] && mb_strlen($out[count($out) - 1]) < $this->minChunkSize) {
                // 直前が小さい → 今の chunk を後ろに連結
                $out[count($out) - 1] = $out[count($out) - 1]."\n\n".$chunk;
            } else {
                $out[] = $chunk;
            }
        }

        // 末尾が小さい場合は前と結合 (前から見ると先に flush 済みなので別パスで吸収)
        while (count($out) >= 2 && mb_strlen($out[count($out) - 1]) < $this->minChunkSize) {
            $tail = array_pop($out);
            $out[count($out) - 1] = $out[count($out) - 1]."\n\n".$tail;
        }

        return $out;
    }

    /**
     * maxChunkSize を超える chunk を文字数で強制カットする。
     *
     * @param  array<int, string>  $chunks
     * @return array<int, string>
     */
    private function breakLarge(array $chunks): array
    {
        $out = [];
        foreach ($chunks as $chunk) {
            while (mb_strlen($chunk) > $this->maxChunkSize) {
                $cutAt = $this->findCutPoint($chunk, $this->maxChunkSize);
                $head = trim(mb_substr($chunk, 0, $cutAt));
                if ($head !== '') {
                    $out[] = $head;
                }
                $chunk = trim(mb_substr($chunk, $cutAt));
            }
            if (trim($chunk) !== '') {
                $out[] = $chunk;
            }
        }

        return $out;
    }

    /**
     * maxLen 以内で「自然な」切れ目を探す。
     * 句点・改行・空白を優先し、見つからなければ maxLen でハードカット。
     */
    private function findCutPoint(string $s, int $maxLen): int
    {
        if (mb_strlen($s) <= $maxLen) {
            return mb_strlen($s);
        }

        $region = mb_substr($s, 0, $maxLen);

        // 後方から優先度高い区切りを探す。半分未満まで戻ると小さすぎるので諦める。
        $minAcceptable = (int) ($maxLen * 0.5);
        $separators = ["\n\n", "。\n", "。", '！', '？', "\n", '。', ' '];

        foreach ($separators as $sep) {
            $pos = mb_strrpos($region, $sep);
            if ($pos !== false && $pos >= $minAcceptable) {
                return $pos + mb_strlen($sep);
            }
        }

        return $maxLen;
    }
}
