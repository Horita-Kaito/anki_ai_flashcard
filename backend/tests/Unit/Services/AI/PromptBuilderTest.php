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

    // ========================================
    // systemPrompt v2.0: 構造 (手順 / 形式選択 / 品質基準 / 作例 / 出力)
    // ========================================

    public function test_システムプロンプトに手順と品質基準の骨格が含まれる(): void
    {
        $prompt = $this->builder->systemPrompt(null);

        $this->assertStringContainsString('# 手順', $prompt);
        $this->assertStringContainsString('1 枚 = 1 知識点', $prompt);
        $this->assertStringContainsString('# カード形式の選び方', $prompt);
        $this->assertStringContainsString('# 品質基準', $prompt);
        $this->assertStringContainsString('番号が小さいほど優先', $prompt);
        $this->assertStringContainsString('# 完全な作例', $prompt);
        $this->assertStringContainsString('# 出力形式', $prompt);
    }

    public function test_システムプロンプトに答えのネタバレ禁止と短答の基準が含まれる(): void
    {
        $prompt = $this->builder->systemPrompt(null);

        $this->assertStringContainsString('question に answer の語', $prompt);
        $this->assertStringContainsString('25 字以内', $prompt);
        $this->assertStringContainsString('列挙を問わない', $prompt);
        $this->assertStringContainsString('メモに書かれていない事実を作らない', $prompt);
    }

    public function test_システムプロンプトのcloze指示は非空マーカーを要求する(): void
    {
        $prompt = $this->builder->systemPrompt(null);

        $this->assertStringContainsString('{{c1::答え}}', $prompt);
        $this->assertStringContainsString('中身は必ず非空', $prompt);
        $this->assertStringContainsString('{{c1::非接触}}', $prompt);
        // v1 の自己違反例 ({{光エネルギー}} のような cN:: 無し省略表記) が復活していないこと
        $this->assertStringNotContainsString('{{光', $prompt);
        $this->assertStringNotContainsString('{{CO2', $prompt);
    }

    public function test_システムプロンプトにメモから候補セットへの完全作例が含まれる(): void
    {
        // 分割粒度は few-shot で最も効率よく伝わる。単文断片ではなく
        // 「メモ全文 → 複数候補」の完全例が入っていることを担保する。
        $prompt = $this->builder->systemPrompt(null);

        $this->assertStringContainsString('入力メモ:', $prompt);
        $this->assertStringContainsString('RFID', $prompt);
        $this->assertStringContainsString('出力候補 (4 枚)', $prompt);
        $this->assertStringContainsString('言い回し自体はカード化しない', $prompt);
    }

    public function test_システムプロンプトにconfidenceの算出基準が含まれる(): void
    {
        $prompt = $this->builder->systemPrompt(null);

        $this->assertStringContainsString('メモに明記されている=0.9', $prompt);
        $this->assertStringContainsString('推論が多い=0.3', $prompt);
    }

    public function test_システムプロンプトの出力形式にコードフェンスを使っていない(): void
    {
        // v1 は「コードフェンス禁止」と言いながら形式サンプル自体をフェンスで
        // 囲っていた (矛盾)。v2 では地の文で JSON 構造を示す。
        $prompt = $this->builder->systemPrompt(null);

        $this->assertStringContainsString('"candidates"', $prompt);
        $this->assertStringContainsString('card_type', $prompt);
        $this->assertStringContainsString('suggested_deck_id', $prompt);
        $this->assertStringContainsString('コードフェンス・コメントは禁止', $prompt);
        $this->assertStringNotContainsString('```', $prompt);
    }

    public function test_システムプロンプトに未置換のcountプレースホルダが残っていない(): void
    {
        $prompt = $this->builder->systemPrompt(null);

        $this->assertStringNotContainsString('{count}', $prompt);
    }

    // ========================================
    // systemPrompt: デッキ一覧 / 分野ポリシー
    // ========================================

    public function test_デッキ一覧が渡されるとシステムプロンプトに含まれる(): void
    {
        $decks = [
            ['id' => 1, 'name' => 'データベース設計'],
            ['id' => 2, 'name' => 'Python基礎'],
        ];

        $prompt = $this->builder->systemPrompt(null, $decks);

        $this->assertStringContainsString('ID:1 「データベース設計」', $prompt);
        $this->assertStringContainsString('ID:2 「Python基礎」', $prompt);
        $this->assertStringContainsString('<user_decks>', $prompt);
        $this->assertStringContainsString('参照データ', $prompt);
    }

    public function test_分野ポリシーは正式な指示として切り口へ反映させる(): void
    {
        $template = new DomainTemplate([
            'user_id' => 1,
            'name' => '情報処理試験',
            'domain_hint' => '用語の定義を正確に答えられるようにする学習。略語は正式名称も併記。',
        ]);

        $prompt = $this->builder->systemPrompt($template);

        $this->assertStringContainsString('【分野ポリシー: 情報処理試験】', $prompt);
        $this->assertStringContainsString('用語の定義を正確に答えられるようにする学習。略語は正式名称も併記。', $prompt);
        // v1 は「ポリシー」と呼びつつ untrusted-reference 扱いで自己矛盾していた。
        // v2 ではユーザー設定として正式に切り口へ反映させる。
        $this->assertStringContainsString('<domain_policy data-kind="user-config">', $prompt);
        $this->assertStringContainsString('切り口選択に反映する', $prompt);
    }

    public function test_domain_hintが空のテンプレートはポリシーブロックを出さない(): void
    {
        $emptyHint = new DomainTemplate([
            'user_id' => 1,
            'name' => '空テンプレ',
            'domain_hint' => '   ',
        ]);
        $nullHint = new DomainTemplate([
            'user_id' => 1,
            'name' => 'null テンプレ',
            'domain_hint' => null,
        ]);

        $this->assertStringNotContainsString('【分野ポリシー:', $this->builder->systemPrompt($emptyHint));
        $this->assertStringNotContainsString('【分野ポリシー:', $this->builder->systemPrompt($nullHint));
    }

    // ========================================
    // userPrompt: 本文 / 枚数 / 追加 / 再生成
    // ========================================

    public function test_ユーザープロンプトにメモ本文と生成指示が含まれる(): void
    {
        $note = new NoteSeed([
            'user_id' => 1,
            'body' => 'TCPはコネクション指向のプロトコル',
            'learning_goal' => 'ネットワーク基礎',
            'subdomain' => 'トランスポート層',
            'note_context' => '基本情報試験対策',
        ]);

        $prompt = $this->builder->userPrompt($note);

        $this->assertStringContainsString('TCPはコネクション指向のプロトコル', $prompt);
        $this->assertStringContainsString('<note_body>', $prompt);
        $this->assertStringContainsString('ネットワーク基礎', $prompt);
        $this->assertStringContainsString('トランスポート層', $prompt);
        $this->assertStringContainsString('基本情報試験対策', $prompt);
        $this->assertStringContainsString('枚数より 1 枚の質を優先', $prompt);
        $this->assertStringContainsString('explanation', $prompt);
    }

    public function test_枚数指示は上限のみで下限ノルマがない(): void
    {
        // v1 の「最低 3 枚」ノルマは、知識点 1 つの短いメモでも瑣末な言い回しまで
        // カード化させる圧力になっていた。上限のみ + 「少なくてよい」を担保する。
        $note = new NoteSeed([
            'user_id' => 1,
            'body' => str_repeat('a', 800),
        ]);

        $prompt = $this->builder->userPrompt($note);

        $this->assertStringContainsString('最大 10 枚', $prompt);
        $this->assertStringContainsString('1〜2 枚で構わない', $prompt);
        $this->assertStringNotContainsString('枚程度', $prompt);
    }

    public function test_単一チャンクモードでも上限は20枚で頭打ち(): void
    {
        $note = new NoteSeed([
            'user_id' => 1,
            'body' => str_repeat('a', 5000),
        ]);

        $prompt = $this->builder->userPrompt($note);

        $this->assertStringContainsString('最大 20 枚', $prompt);
    }

    public function test_チャンクモードでは15枚上限の枚数指示が含まれる(): void
    {
        $note = new NoteSeed([
            'user_id' => 1,
            'body' => '元のメモ全体',
        ]);

        $prompt = $this->builder->userPrompt($note, [
            'body_override' => str_repeat('チャンク本文。', 200),
            'chunk_index' => 0,
            'chunks_total' => 3,
        ]);

        $this->assertStringContainsString('このチャンクの範囲のみ', $prompt);
        $this->assertStringContainsString('最大 15 枚', $prompt);
        $this->assertStringNotContainsString('30〜60', $prompt);
    }

    public function test_追加モードで既存質問が重複回避指示と共に渡される(): void
    {
        $note = new NoteSeed([
            'user_id' => 1,
            'body' => 'テストメモ',
        ]);

        $prompt = $this->builder->userPrompt($note, [
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

    public function test_再生成モードで前回候補の回避指示とフィードバックが渡される(): void
    {
        $note = new NoteSeed([
            'user_id' => 1,
            'body' => 'テストメモ',
        ]);

        $prompt = $this->builder->userPrompt($note, [
            'regenerate' => true,
            'existing_questions' => ['DI とは何か?'],
            'feedback' => '答えが長すぎるので短くして',
        ]);

        $this->assertStringContainsString('前回までの候補', $prompt);
        $this->assertStringContainsString('- DI とは何か?', $prompt);
        $this->assertStringContainsString('同じ問い・同じ切り口', $prompt);
        $this->assertStringContainsString('ユーザーの修正指示', $prompt);
        $this->assertStringContainsString('答えが長すぎるので短くして', $prompt);
        // 追加モード専用の指示は混ざらない
        $this->assertStringNotContainsString('追加生成モード', $prompt);
    }

    public function test_再生成モードでもフィードバック未入力なら修正指示ブロックは出ない(): void
    {
        $note = new NoteSeed([
            'user_id' => 1,
            'body' => 'テストメモ',
        ]);

        $prompt = $this->builder->userPrompt($note, [
            'regenerate' => true,
            'existing_questions' => [],
            'feedback' => '   ',
        ]);

        $this->assertStringNotContainsString('ユーザーの修正指示', $prompt);
        $this->assertStringNotContainsString('前回までの候補', $prompt);
    }

    public function test_プロンプトバージョンを取得できる(): void
    {
        $this->assertSame('v1.1', $this->builder->promptVersion());
    }
}
