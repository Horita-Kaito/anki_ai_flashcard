<?php

declare(strict_types=1);

namespace App\Services\AI;

use App\Models\DomainTemplate;
use App\Models\NoteSeed;

/**
 * メモ + 分野テンプレートから AI プロンプトを組み立てる。
 * プロンプト仕様の変更時は config/ai.php の prompt_version をバンプすること。
 */
final class PromptBuilder
{
    public function __construct(
        private readonly string $promptVersion,
    ) {}

    public static function fromConfig(): self
    {
        return new self(config('ai.prompt_version', 'v1.0'));
    }

    public function promptVersion(): string
    {
        return $this->promptVersion;
    }

    public function systemPrompt(?DomainTemplate $template): string
    {
        $base = <<<PROMPT
あなたは学習者向けのフラッシュカード生成アシスタントです。
ユーザーの短い学習メモを読み、効果的なフラッシュカード候補を複数生成します。

【生成ポリシー】
- 1 カード 1 知識 を厳守
- 想起を促す具体的な問いにする
- 回答は短く、曖昧さを避ける
- メモに無い情報を過剰に補完しない
- 学習目的に沿った切り口を優先

【出力形式】
必ず以下の JSON 配列のみを返すこと。前後の説明文は禁止。
```
{
  "candidates": [
    {
      "question": "...",
      "answer": "...",
      "card_type": "basic_qa" | "comparison" | "practical_case" | "cloze_like",
      "focus_type": "definition" | "purpose" | "comparison" | "practical_caution" | "cause_effect" | "example" | "misconception",
      "rationale": "この問いを選んだ理由 (50文字以内)",
      "confidence": 0.0〜1.0
    }
  ]
}
```
PROMPT;

        if ($template !== null) {
            $base .= "\n\n【分野ポリシー: {$template->name}】\n";
            $base .= $this->formatInstruction($template->instruction_json ?? []);
        }

        return $base;
    }

    /**
     * @param  array<string, mixed>  $options  count, preferred_card_types 等
     */
    public function userPrompt(NoteSeed $note, array $options = []): string
    {
        $count = (int) ($options['count'] ?? 3);
        $preferredTypes = $options['preferred_card_types'] ?? null;

        $parts = [
            "【メモ本文】",
            $note->body,
        ];

        if ($note->learning_goal) {
            $parts[] = "\n【学習目的】\n".$note->learning_goal;
        }
        if ($note->subdomain) {
            $parts[] = "\n【サブ分野】\n".$note->subdomain;
        }
        if ($note->note_context) {
            $parts[] = "\n【補足】\n".$note->note_context;
        }

        $parts[] = "\n【生成指示】";
        $parts[] = "- 候補数: {$count} 件";
        if (is_array($preferredTypes) && $preferredTypes !== []) {
            $parts[] = '- 優先するカード種別: '.implode(', ', $preferredTypes);
        }
        $parts[] = '- 必ず上記の JSON 形式で返すこと';

        return implode("\n", $parts);
    }

    /**
     * @param  array<string, mixed>  $instruction
     */
    private function formatInstruction(array $instruction): string
    {
        $lines = [];
        if (! empty($instruction['goal'])) {
            $lines[] = '目的: '.$instruction['goal'];
        }
        if (! empty($instruction['priorities']) && is_array($instruction['priorities'])) {
            $lines[] = '優先観点: '.implode(' / ', $instruction['priorities']);
        }
        if (! empty($instruction['avoid']) && is_array($instruction['avoid'])) {
            $lines[] = '避けたい問い方: '.implode(' / ', $instruction['avoid']);
        }
        if (! empty($instruction['answer_style'])) {
            $lines[] = '回答スタイル: '.$instruction['answer_style'];
        }
        if (! empty($instruction['difficulty_policy'])) {
            $lines[] = '難易度方針: '.$instruction['difficulty_policy'];
        }
        if (! empty($instruction['note_interpretation_policy'])) {
            $lines[] = 'メモ解釈方針: '.$instruction['note_interpretation_policy'];
        }

        return implode("\n", $lines);
    }
}
