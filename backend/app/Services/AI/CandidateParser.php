<?php

declare(strict_types=1);

namespace App\Services\AI;

use App\Enums\CardType;
use App\Exceptions\Domain\AiGenerationFailedException;

/**
 * AI からの生応答テキストを構造化候補配列にパースする。
 *
 * 失敗パターンと挙動:
 *   - 完全に空 / コードフェンスも JSON も無い → invalidResponse 例外 (debug に末尾抜粋)
 *   - JSON 末尾が壊れている (max_output_tokens で打ち切り) →
 *     完成済み要素のみ抽出して ParseResult(truncated=true) で返す。
 *     1 件も復元できない場合は jsonTruncated 例外
 *   - decode 自体は成功するが要素 0 件 → invalidResponse 例外
 */
final class CandidateParser
{
    /**
     * @throws AiGenerationFailedException
     */
    public function parse(string $rawContent): ParseResult
    {
        $trimmed = trim($rawContent);
        if ($trimmed === '') {
            throw AiGenerationFailedException::invalidResponse(
                'empty content',
                'rawContent is empty',
            );
        }

        $json = $this->extractJson($trimmed);

        // 通常パース
        if ($json !== null) {
            $decoded = json_decode($json, true);
            if (is_array($decoded)) {
                $list = $decoded['candidates'] ?? $decoded;
                if (is_array($list)) {
                    $items = $this->normalizeItems($list);
                    if ($items !== []) {
                        return new ParseResult($items, false);
                    }
                }
            }
        }

        // 部分リカバリ (末尾切れ JSON の救出)
        $recovered = $this->recoverPartialCandidates($trimmed);
        if ($recovered !== []) {
            $items = $this->normalizeItems($recovered);
            if ($items !== []) {
                $tail = mb_substr($trimmed, max(0, mb_strlen($trimmed) - 200));
                $detail = sprintf(
                    'truncated, recovered %d items, tail=%s',
                    count($items),
                    $tail,
                );

                return new ParseResult($items, true, $detail);
            }
        }

        // 完全失敗
        $jsonError = json_last_error_msg();
        $tail = mb_substr($trimmed, max(0, mb_strlen($trimmed) - 200));
        $hasJsonStart = str_contains($trimmed, '{') || str_contains($trimmed, '[');
        $endsWithCloseBracket = str_ends_with($trimmed, '}') || str_ends_with($trimmed, ']');

        if ($hasJsonStart && ! $endsWithCloseBracket) {
            // JSON 構造の開始はあるが括弧で閉じていない = 打ち切り濃厚
            throw AiGenerationFailedException::jsonTruncated(
                sprintf('json_error=%s, tail=%s', $jsonError, $tail),
            );
        }

        throw AiGenerationFailedException::invalidResponse(
            'JSON parse failed',
            sprintf('json_error=%s, tail=%s', $jsonError, $tail),
        );
    }

    /**
     * 応答文から JSON 部分を抽出する (整形された応答を期待)。
     * コードフェンス、前後の説明文を除去。
     */
    private function extractJson(string $trimmed): ?string
    {
        // コードフェンスを除去
        if (preg_match('/```(?:json)?\s*(.+?)\s*```/s', $trimmed, $m)) {
            return trim($m[1]);
        }

        // 最初の { から最後の } までを抽出
        $start = strpos($trimmed, '{');
        $end = strrpos($trimmed, '}');
        if ($start !== false && $end !== false && $end > $start) {
            return substr($trimmed, $start, $end - $start + 1);
        }

        // 配列直下の場合
        $start = strpos($trimmed, '[');
        $end = strrpos($trimmed, ']');
        if ($start !== false && $end !== false && $end > $start) {
            return substr($trimmed, $start, $end - $start + 1);
        }

        return null;
    }

    /**
     * 末尾が壊れた JSON から、完成済みの candidates 要素 (`{...}`) だけを抽出する。
     * `"candidates"` キー直後の `[` を起点に、ネスト深さを追って完全に閉じた
     * オブジェクトのみ json_decode する。文字列内の `{` や `}`、エスケープも考慮する。
     *
     * @return array<int, array<string, mixed>>
     */
    private function recoverPartialCandidates(string $trimmed): array
    {
        // candidates 配列の開始位置を探す
        if (! preg_match('/"candidates"\s*:\s*\[/', $trimmed, $m, PREG_OFFSET_CAPTURE)) {
            // candidates キーがない場合はトップレベル配列の可能性を試す
            $arrayStart = strpos($trimmed, '[');
            if ($arrayStart === false) {
                return [];
            }
            $body = substr($trimmed, $arrayStart + 1);
        } else {
            $bodyStart = $m[0][1] + strlen($m[0][0]);
            $body = substr($trimmed, $bodyStart);
        }

        return $this->extractCompleteObjects($body);
    }

    /**
     * 配列ボディから、ネスト深さ 1 のオブジェクトを順に取り出す。
     *
     * @return array<int, array<string, mixed>>
     */
    private function extractCompleteObjects(string $body): array
    {
        $items = [];
        $depth = 0;
        $start = -1;
        $inString = false;
        $escape = false;
        $len = strlen($body);

        for ($i = 0; $i < $len; $i++) {
            $c = $body[$i];

            if ($escape) {
                $escape = false;

                continue;
            }
            if ($c === '\\') {
                $escape = true;

                continue;
            }
            if ($c === '"') {
                $inString = ! $inString;

                continue;
            }
            if ($inString) {
                continue;
            }

            if ($c === '{') {
                if ($depth === 0) {
                    $start = $i;
                }
                $depth++;
            } elseif ($c === '}') {
                $depth--;
                if ($depth === 0 && $start !== -1) {
                    $obj = substr($body, $start, $i - $start + 1);
                    $decoded = json_decode($obj, true);
                    if (is_array($decoded)) {
                        $items[] = $decoded;
                    }
                    $start = -1;
                }
            } elseif ($c === ']' && $depth === 0) {
                // candidates 配列の閉じ括弧、ここで終わり
                break;
            }
        }

        return $items;
    }

    /**
     * 生 JSON 配列を正規化済み候補配列に変換する。
     * 不正な要素はスキップし、デフォルト値で埋める。
     *
     * @param  array<int|string, mixed>  $list
     * @return array<int, array<string, mixed>>
     */
    private function normalizeItems(array $list): array
    {
        $out = [];
        foreach ($list as $item) {
            if (! is_array($item)) {
                continue;
            }
            $question = $this->strOrNull($item, 'question');
            $answer = $this->strOrNull($item, 'answer');
            if ($question === null || $answer === null || $question === '' || $answer === '') {
                continue;
            }

            $cardType = $this->strOrNull($item, 'card_type') ?? 'basic_qa';
            if (! in_array($cardType, CardType::values(), true)) {
                $cardType = 'basic_qa';
            }

            // cloze_like を名乗っているのに question に有効な {{cN::xxx}} が無ければ
            // フロントで穴埋め描画できないため basic_qa にダウングレードする。
            if ($cardType === 'cloze_like' && ! self::hasValidCloze($question)) {
                $cardType = 'basic_qa';
            }

            $confidence = $item['confidence'] ?? null;
            if ($confidence !== null) {
                $confidence = max(0.0, min(1.0, (float) $confidence));
            }

            $suggestedDeckId = $item['suggested_deck_id'] ?? null;
            if ($suggestedDeckId !== null) {
                $suggestedDeckId = is_numeric($suggestedDeckId) ? (int) $suggestedDeckId : null;
            }

            $explanation = $this->strOrNull($item, 'explanation');
            if ($explanation !== null) {
                $explanation = mb_substr($explanation, 0, 5000);
            }

            $out[] = [
                'question' => mb_substr($question, 0, 2000),
                'answer' => mb_substr($answer, 0, 2000),
                'card_type' => $cardType,
                'focus_type' => $this->strOrNull($item, 'focus_type'),
                'rationale' => $this->strOrNull($item, 'rationale'),
                'explanation' => $explanation,
                'confidence' => $confidence,
                'suggested_deck_id' => $suggestedDeckId,
            ];
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $arr
     */
    private function strOrNull(array $arr, string $key): ?string
    {
        $v = $arr[$key] ?? null;
        if ($v === null) {
            return null;
        }

        return is_string($v) ? $v : (string) $v;
    }

    /**
     * `{{cN::xxx}}` (xxx は非空) が 1 つ以上含まれるかを判定する。
     * フロント側の ClozeText が描画できる cloze 記法の最低条件。
     */
    public static function hasValidCloze(string $question): bool
    {
        return (bool) preg_match('/\{\{c\d+::[^}]+\}\}/u', $question);
    }
}
