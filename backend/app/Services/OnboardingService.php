<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\DeckRepositoryInterface;
use App\Contracts\Repositories\DomainTemplateRepositoryInterface;
use App\Contracts\Repositories\TagRepositoryInterface;
use App\Contracts\Repositories\UserRepositoryInterface;
use App\Contracts\Repositories\UserSettingRepositoryInterface;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final class OnboardingService
{
    public function __construct(
        private readonly DomainTemplateRepositoryInterface $domainTemplateRepository,
        private readonly DeckRepositoryInterface $deckRepository,
        private readonly TagRepositoryInterface $tagRepository,
        private readonly UserSettingRepositoryInterface $userSettingRepository,
        private readonly UserRepositoryInterface $userRepository,
    ) {}

    /**
     * ユーザーの学習目標に基づいて初期データを作成する。
     *
     * @param  array<int, string>  $goals
     * @return array{templates: int, decks: int, tags: int}
     */
    public function execute(User $user, array $goals): array
    {
        return DB::transaction(function () use ($user, $goals): array {
            $templateCount = 0;
            $deckCount = 0;
            $tagNames = [];
            $firstTemplateId = null;

            foreach ($goals as $goal) {
                $config = $this->getGoalConfig($goal);

                $template = $this->domainTemplateRepository->create($user->id, [
                    'name' => $config['template_name'],
                    'description' => $config['template_description'],
                    'instruction_json' => $config['instruction_json'],
                ]);

                if ($firstTemplateId === null) {
                    $firstTemplateId = $template->id;
                }

                $this->deckRepository->create($user->id, [
                    'name' => $config['deck_name'],
                    'default_domain_template_id' => $template->id,
                ]);

                $templateCount++;
                $deckCount++;

                foreach ($config['tags'] as $tagName) {
                    $tagNames[] = $tagName;
                }
            }

            // 共通タグを追加
            foreach (['重要', '復習必須', '基礎'] as $commonTag) {
                $tagNames[] = $commonTag;
            }

            // 重複を排除してタグ作成
            $uniqueTagNames = array_unique($tagNames);
            $tagCount = 0;
            foreach ($uniqueTagNames as $tagName) {
                $this->tagRepository->create($user->id, ['name' => $tagName]);
                $tagCount++;
            }

            $this->userSettingRepository->create($user->id, [
                'default_domain_template_id' => $firstTemplateId,
            ]);

            $this->userRepository->markOnboarded($user);

            return [
                'templates' => $templateCount,
                'decks' => $deckCount,
                'tags' => $tagCount,
            ];
        });
    }

    /**
     * 目標に応じた設定を返す。
     *
     * @return array{template_name: string, template_description: string, instruction_json: array<string, mixed>, deck_name: string, tags: array<int, string>}
     */
    private function getGoalConfig(string $goal): array
    {
        return match ($goal) {
            'programming' => [
                'template_name' => 'プログラミング',
                'template_description' => 'プログラミング・技術学習向け',
                'instruction_json' => [
                    'goal' => 'プログラミングの概念・構文・設計パターンを定着させる',
                    'priorities' => ['構文や API の使い方を問う', '設計意図・トレードオフを問う', 'バグや落とし穴を指摘する'],
                    'avoid' => ['丸暗記だけで答えられる問い', '長いコードブロックを回答に含める'],
                    'answer_style' => 'コード片は最小限にし、要点を1-2文で説明',
                    'difficulty_policy' => '実務で遭遇するレベルを想定',
                    'note_interpretation_policy' => 'メモ中のコード片は正確に扱い、言語仕様に基づいて補足する',
                ],
                'deck_name' => 'プログラミング学習',
                'tags' => ['コード', '設計パターン'],
            ],
            'language' => [
                'template_name' => '語学',
                'template_description' => '語学学習向け (英語、中国語など)',
                'instruction_json' => [
                    'goal' => '語彙・文法・表現パターンを定着させる',
                    'priorities' => ['意味を問う', '用法・コロケーションを問う', '類義語との違いを問う'],
                    'avoid' => ['文脈なしの単純な単語暗記', '母語で長い説明を求める問い'],
                    'answer_style' => '対訳を含め、例文を1つ添える',
                    'difficulty_policy' => '学習者のメモのレベルに合わせる',
                    'note_interpretation_policy' => 'メモ中の対象言語はそのまま保持し、必要に応じて発音・ピンインを補足する',
                ],
                'deck_name' => '語学学習',
                'tags' => ['単語', '文法'],
            ],
            'exam' => [
                'template_name' => '資格試験',
                'template_description' => '資格試験対策向け',
                'instruction_json' => [
                    'goal' => '試験に頻出する知識を効率的に定着させる',
                    'priorities' => ['頻出問題のパターンを問う', '正誤判断の根拠を問う', '紛らわしい選択肢の違いを問う'],
                    'avoid' => ['試験範囲外の深掘り', '実務寄りの応用問題'],
                    'answer_style' => '要点を簡潔に、根拠を1文で添える',
                    'difficulty_policy' => '試験の出題レベルに合わせる',
                    'note_interpretation_policy' => 'メモ中の法令・規定は正確に扱い、最新版を参照する',
                ],
                'deck_name' => '資格試験対策',
                'tags' => ['頻出', '要暗記'],
            ],
            'math_science' => [
                'template_name' => '数学・理系',
                'template_description' => '数学・理系科目向け',
                'instruction_json' => [
                    'goal' => '公式・定理・証明の理解を定着させる',
                    'priorities' => ['公式の導出過程を問う', '定理の適用条件を問う', '具体的な計算例を問う'],
                    'avoid' => ['単純な計算ドリル', '証明の丸暗記を求める問い'],
                    'answer_style' => '数式を含め、導出のポイントを1-2文で説明',
                    'difficulty_policy' => '基礎から応用まで段階的に',
                    'note_interpretation_policy' => 'メモ中の数式は正確に扱い、必要に応じてLaTeX表記で補足する',
                ],
                'deck_name' => '数学・理系',
                'tags' => ['公式', '定理'],
            ],
            'business' => [
                'template_name' => 'ビジネス',
                'template_description' => 'ビジネス・経営学習向け',
                'instruction_json' => [
                    'goal' => 'ビジネスの概念・フレームワーク・用語を定着させる',
                    'priorities' => ['用語の定義を問う', 'フレームワークの適用場面を問う', '実例との対応を問う'],
                    'avoid' => ['抽象的すぎる問い', '特定業界に偏った問い'],
                    'answer_style' => '要点を簡潔に、実務での活用イメージを1文添える',
                    'difficulty_policy' => '基礎的なビジネス知識から',
                    'note_interpretation_policy' => 'メモ中の業界用語・略語は正確に扱い、必要に応じて正式名称を補足する',
                ],
                'deck_name' => 'ビジネス・経営',
                'tags' => ['用語', 'フレームワーク'],
            ],
            'other' => [
                'template_name' => '一般',
                'template_description' => '汎用的な学習テンプレート',
                'instruction_json' => [
                    'goal' => '幅広い分野の知識を定着させる',
                    'priorities' => ['定義を問う', 'なぜ必要かを問う', '具体例を挙げる'],
                    'avoid' => ['長文回答を求める問い', '複数の知識を同時に問う'],
                    'answer_style' => '1-2文で簡潔に',
                    'difficulty_policy' => '初学者〜中級者向け',
                    'note_interpretation_policy' => 'メモにない内容を過剰に補完しない',
                ],
                'deck_name' => '一般学習',
                'tags' => [],
            ],
        };
    }
}
