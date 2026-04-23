<?php

declare(strict_types=1);

namespace Tests\Unit\Services\AI;

use App\Models\DomainTemplate;
use App\Models\NoteSeed;
use App\Services\AI\PromptBuilder;
use PHPUnit\Framework\TestCase;

final class PromptBuilderTest extends TestCase
{
    private PromptBuilder $builder;

    protected function setUp(): void
    {
        parent::setUp();
        $this->builder = new PromptBuilder('v1.1');
    }

    public function test_システムプロンプトにウォズニアックの原則が含まれる(): void
    {
        $prompt = $this->builder->systemPrompt(null);

        $this->assertStringContainsString('最小情報原則', $prompt);
        $this->assertStringContainsString('具体的な問い', $prompt);
        $this->assertStringContainsString('1 語または短い語句', $prompt);
        $this->assertStringContainsString('集合・列挙の回避', $prompt);
        $this->assertStringContainsString('穴埋め', $prompt);
        $this->assertStringContainsString('双方向カード', $prompt);
        $this->assertStringContainsString('手順・順序・依存関係', $prompt);
        $this->assertStringContainsString('文脈', $prompt);
        $this->assertStringContainsString('冗長性', $prompt);
    }

    public function test_システムプロンプトに冗長性の多角度ルールが含まれる(): void
    {
        $prompt = $this->builder->systemPrompt(null);

        $this->assertStringContainsString('複数角度', $prompt);
        $this->assertStringContainsString('単語 → 意味', $prompt);
        $this->assertStringContainsString('意味 → 単語', $prompt);
        $this->assertStringContainsString('穴埋め位置', $prompt);
    }

    public function test_システムプロンプトに分野タグと具体例の指示が含まれる(): void
    {
        $prompt = $this->builder->systemPrompt(null);

        $this->assertStringContainsString('分野タグ', $prompt);
        $this->assertStringContainsString('[生物]', $prompt);
        $this->assertStringContainsString('具体例', $prompt);
        $this->assertStringContainsString('explanation', $prompt);
    }

    public function test_システムプロンプトに手順系の3手法が含まれる(): void
    {
        $prompt = $this->builder->systemPrompt(null);

        $this->assertStringContainsString('穴埋め連鎖', $prompt);
        $this->assertStringContainsString('{{c1::', $prompt);
        $this->assertStringContainsString('前後を個別に問う', $prompt);
        $this->assertStringContainsString('オーバーラップ法', $prompt);
    }

    public function test_システムプロンプトに曖昧な問いを禁止する悪例が含まれる(): void
    {
        $prompt = $this->builder->systemPrompt(null);

        $this->assertStringContainsString('〜について述べよ', $prompt);
        $this->assertStringContainsString('光合成', $prompt);
    }

    public function test_システムプロンプトに問題文への答え混入禁止ルールが含まれる(): void
    {
        $prompt = $this->builder->systemPrompt(null);

        $this->assertStringContainsString('問題文 (question) に答え (answer) の用語そのものを登場させない', $prompt);
        $this->assertStringContainsString('コンテンツマーケティング', $prompt);
        $this->assertStringContainsString('セルフチェック', $prompt);
    }

    public function test_システムプロンプトに列挙問題を禁止する悪例が含まれる(): void
    {
        $prompt = $this->builder->systemPrompt(null);

        $this->assertStringContainsString('3つの特徴', $prompt);
    }

    public function test_システムプロンプトに_j_s_o_n出力形式の定義が含まれる(): void
    {
        $prompt = $this->builder->systemPrompt(null);

        $this->assertStringContainsString('"candidates"', $prompt);
        $this->assertStringContainsString('card_type', $prompt);
        $this->assertStringContainsString('suggested_deck_id', $prompt);
    }

    public function test_デッキ一覧が渡されるとシステムプロンプトに含まれる(): void
    {
        $decks = [
            ['id' => 1, 'name' => 'データベース設計'],
            ['id' => 2, 'name' => 'Python基礎'],
        ];

        $prompt = $this->builder->systemPrompt(null, $decks);

        $this->assertStringContainsString('ID:1 「データベース設計」', $prompt);
        $this->assertStringContainsString('ID:2 「Python基礎」', $prompt);
    }

    public function test_分野テンプレートが渡されるとシステムプロンプトに含まれる(): void
    {
        $template = new DomainTemplate([
            'user_id' => 1,
            'name' => '情報処理試験',
            'instruction_json' => [
                'goal' => '用語の定義を正確に答えられるようにする',
                'priorities' => ['定義', '略語の正式名称'],
                'avoid' => ['長文説明'],
                'answer_style' => '用語1語で答える',
                'difficulty_policy' => '基本情報レベル',
                'note_interpretation_policy' => 'メモ内の太字を優先',
            ],
        ]);

        $prompt = $this->builder->systemPrompt($template);

        $this->assertStringContainsString('分野ポリシー: 情報処理試験', $prompt);
        $this->assertStringContainsString('目的: 用語の定義を正確に答えられるようにする', $prompt);
        $this->assertStringContainsString('優先観点: 定義 / 略語の正式名称', $prompt);
        $this->assertStringContainsString('避けたい問い方: 長文説明', $prompt);
        $this->assertStringContainsString('回答スタイル: 用語1語で答える', $prompt);
    }

    public function test_ユーザープロンプトにメモ本文と生成指示が含まれる(): void
    {
        $note = new NoteSeed([
            'user_id' => 1,
            'body' => 'TCPはコネクション指向のプロトコル',
            'learning_goal' => 'ネットワーク基礎',
            'subdomain' => 'トランスポート層',
            'note_context' => '基本情報試験対策',
        ]);

        $prompt = $this->builder->userPrompt($note, ['count' => 5]);

        $this->assertStringContainsString('TCPはコネクション指向のプロトコル', $prompt);
        $this->assertStringContainsString('ネットワーク基礎', $prompt);
        $this->assertStringContainsString('トランスポート層', $prompt);
        $this->assertStringContainsString('基本情報試験対策', $prompt);
        $this->assertStringContainsString('最大 5 件', $prompt);
        $this->assertStringContainsString('過不足なく', $prompt);
    }

    public function test_追加モードで既存質問が重複回避指示と共に渡される(): void
    {
        $note = new NoteSeed([
            'user_id' => 1,
            'body' => 'テストメモ',
        ]);

        $prompt = $this->builder->userPrompt($note, [
            'count' => 3,
            'additional' => true,
            'existing_questions' => [
                'DI とは何か?',
                'DI のメリットは?',
            ],
        ]);

        $this->assertStringContainsString('既に生成済みの候補', $prompt);
        $this->assertStringContainsString('重複しない切り口', $prompt);
        $this->assertStringContainsString('- DI とは何か?', $prompt);
        $this->assertStringContainsString('- DI のメリットは?', $prompt);
        $this->assertStringContainsString('追加生成モード', $prompt);
    }

    public function test_優先カード種別がユーザープロンプトに含まれる(): void
    {
        $note = new NoteSeed([
            'user_id' => 1,
            'body' => 'テストメモ',
        ]);

        $prompt = $this->builder->userPrompt($note, [
            'count' => 3,
            'preferred_card_types' => ['cloze_like', 'basic_qa'],
        ]);

        $this->assertStringContainsString('優先するカード種別: cloze_like, basic_qa', $prompt);
    }

    public function test_プロンプトバージョンを取得できる(): void
    {
        $this->assertSame('v1.1', $this->builder->promptVersion());
    }
}
