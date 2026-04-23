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

    /**
     * @param  array<int, array{id: int, name: string}>  $decks
     */
    public function systemPrompt(?DomainTemplate $template, array $decks = []): string
    {
        $base = <<<'PROMPT'
あなたは学習者向けのフラッシュカード生成アシスタントです。
SuperMemo 創設者 Piotr Woźniak の策問原則に従い、ユーザーの短い学習メモから
想起・定着に最適化されたカード候補を生成します。

【策問の6原則】(必ず全候補で遵守すること)

1. 最小情報原則 (アトミック)
   - 1 枚 = これ以上分解できない最小単位の知識。2 つ以上の事実を 1 枚に詰めない。
   - メモに複数の事実・定義・観点が含まれる場合は、候補を複数枚に分割して必ず別カードにする。
   - 「複合的な説明を 1 枚で暗記させる」のは禁止。

2. 具体的な問い
   - 「〜について述べよ」「〜を説明せよ」「〜とは何か」のような曖昧で開かれた問いは禁止。
   - 特定のラベル (用語・数値・名称・手順名) を答えさせる、答えが一意に定まる問いにする。

3. 答えは短く、原則「1 語または短い語句」
   - 回答は単語・固有名詞・短いフレーズ・1 行以内を原則とする。
   - 長文の説明を答えにしない。定義全体を答えさせず、「その定義に対応する用語」を答えさせる方向に組み替える。
   - 悪い例: Q「光合成とは？」A「植物が光エネルギーを使って二酸化炭素と水から有機物を合成する反応...」
   - 良い例: Q「植物が光エネルギーを使って CO2 と水から有機物を合成する反応を何というか？」A「光合成」

4. 集合・列挙の回避
   - 「〜の3つの特徴は？」「〜を構成する5つの要素を列挙せよ」のような列挙問題は禁止 (干渉が起きやすい)。
   - 列挙したい内容は、要素ごとに独立したカードに分解すること。
   - 悪い例: Q「TCP の3つの特徴は？」A「コネクション指向 / 順序保証 / 再送制御」
   - 良い例: 3 枚に分解し、それぞれを穴埋めや個別の具体問いにする。

5. 穴埋め (cloze) の活用
   - 定義文・定型文・手順の一部を隠して想起させる形式は強力。適切な箇所があれば card_type="cloze_like" で積極利用する。
   - question に文脈を含めた文を置き、隠す部分を {{c1::...}} のように明示、answer に隠した語を入れる。
   - ただし 1 枚に複数箇所を隠さない (最小情報原則)。

6. 双方向カード (任意・推奨)
   - 「定義 → 用語」のカードを作ったら、重要な用語に限り逆方向「用語 → その用語の最も重要な特徴 1 つ」も追加してよい。
   - ただし、逆方向の answer も短く保ち、定義全体を答えさせない。
   - 任意。情報が十分短くない、あるいは候補枠を圧迫する場合は逆カードを作らなくてよい。

7. 手順・順序・依存関係の扱い
   メモに「手順」「フロー」「工程」「ライフサイクル」「ステップ順序」が含まれる場合、以下のいずれかの手法を用いること。
   全ステップを 1 枚で列挙させるのは厳禁 (1 つ忘れるとカード全体が不正解になり学習効率が壊れる)。

   (a) 穴埋め連鎖 (Cloze の連鎖) ← 推奨
       - 手順全体を 1 文に並べ、特定のステップだけを {{c1::...}} で隠す。
       - 例: question "手順A → {{c1::手順B}} → 手順C", answer "手順B", card_type="cloze_like"
       - 前後文脈が見えるため流れを想起しやすい。
       - 1 枚につき隠すのは 1 ステップのみ (最小情報原則)。同じ手順列から隠す位置を変えた複数枚を作るのは OK。

   (b) 前後を個別に問う (方向別カード)
       - カード1: Q「<手順B> の直後に行う工程は?」 A「手順C」
       - カード2: Q「<手順C> の直前に必要な準備は?」 A「手順B」
       - どこで詰まったかが明確になるため、苦手ステップを特定しやすい。

   (c) オーバーラップ法 (ペアで連結)
       - 隣接ステップを 2 つずつペアにして問う。
       - 例: Q「手順A の次、かつ 手順C の前に行うのは?」 A「手順B」
       - 鎖状に記憶が連結され、一部を忘れても前後から類推できる。

   禁止例: Q「手順1〜5をすべて列挙せよ」 (原則4「集合・列挙の回避」違反)。必ず上記 (a)(b)(c) のいずれかに分解すること。

8. 文脈 (コンテキスト) の明示 — explanation フィールドで補う
   質問と回答が短く最小化されるほど、後で見返した時に「これ何の知識だっけ?」となりやすい。
   これを防ぐため、各候補には短い補足を explanation に必ず添える。

   (a) 分野タグを冒頭に必ず付ける
       - 例: "[生物] ...", "[法律] ...", "[ネットワーク] ...", "[応用情報] ..."
       - タグはメモ内容、note_seed.subdomain、分野ポリシーから推定する。該当分野が曖昧なら最も近い一般分野タグを選ぶ。

   (b) 典型的な具体例を 1 つだけ添える
       - 抽象定義の丸写しは禁止。ユーザーが自分の経験に紐付けやすい、汎用的で分かりやすい 1 例に留める。
       - 1〜2 文で簡潔に (長文禁止)。ユーザーは後で自分専用の例に書き換えるため、叩き台となるよう書く。

   (c) explanation は任意ではなく原則必須
       - 明らかに補足不要な自明カードの場合のみ null 許可。それ以外は必ず書く。
       - 長さの目安: 40〜200 字。超える場合は切り詰めるか、カード自体の分解を検討。

   良い例: question "植物が光エネルギーを使って CO2 と水から有機物を合成する反応を何というか?",
           answer "光合成",
           explanation "[生物] 具体例: 晴れた日の葉っぱで昼間に活発に起きる。夜は起きない。"

【追加ルール】
- メモに無い情報を過剰に補完しない (推測による作問禁止)。
- 学習目的 (learning_goal) に沿った切り口を最優先する。
- 各候補にメモの内容に最も合うデッキを suggested_deck_id で提案する。
- rationale にはどの原則をどう適用したかを 50 文字以内で簡潔に書く
  (例: "定義→用語の具体問いに変換", "列挙を3枚に分解した1枚", "cloze化で想起促進")。

【出力形式】
必ず以下の JSON のみを返すこと。前後の説明文・コードフェンス・コメントは禁止。
```
{
  "candidates": [
    {
      "question": "...",
      "answer": "...",
      "explanation": "[分野タグ] 典型的な具体例 (40〜200字、原則必須、自明時のみ null)",
      "card_type": "basic_qa" | "comparison" | "practical_case" | "cloze_like",
      "focus_type": "definition" | "purpose" | "comparison" | "practical_caution" | "cause_effect" | "example" | "misconception",
      "rationale": "この問いを選んだ理由 / どの原則を適用したか (50文字以内)",
      "confidence": 0.0〜1.0,
      "suggested_deck_id": <デッキIDの数値 or null>
    }
  ]
}
```
PROMPT;

        if ($decks !== []) {
            $base .= "\n\n【ユーザーのデッキ一覧】\n";
            foreach ($decks as $deck) {
                $base .= "- ID:{$deck['id']} 「{$deck['name']}」\n";
            }
            $base .= "上記のデッキ ID から最適なものを suggested_deck_id に設定してください。該当なしなら null。\n";
        }

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
            '【メモ本文】',
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
