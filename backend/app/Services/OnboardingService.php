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
                    'domain_hint' => $config['domain_hint'],
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
                $this->tagRepository->findByNameForUser($user->id, $tagName)
                    ?? $this->tagRepository->create($user->id, ['name' => $tagName]);
                $tagCount++;
            }

            $existingSetting = $this->userSettingRepository->findForUser($user->id);
            if ($existingSetting !== null) {
                $this->userSettingRepository->update($existingSetting, [
                    'default_domain_template_id' => $firstTemplateId,
                ]);
            } else {
                $this->userSettingRepository->create($user->id, [
                    'default_domain_template_id' => $firstTemplateId,
                ]);
            }

            $this->userRepository->markOnboarded($user);

            return [
                'templates' => $templateCount,
                'decks' => $deckCount,
                'tags' => $tagCount,
            ];
        });
    }

    /**
     * 目標に応じたプリセット設定を返す。
     * domain_hint は AI に「分野ポリシー」として 1 ブロックで渡される 1〜2 文の自由文。
     *
     * @return array{template_name: string, template_description: string, domain_hint: string, deck_name: string, tags: array<int, string>}
     */
    private function getGoalConfig(string $goal): array
    {
        return match ($goal) {
            'programming' => [
                'template_name' => 'プログラミング',
                'template_description' => 'プログラミング・技術学習向け',
                'domain_hint' => 'プログラミングの概念・構文・設計パターンの定着が目的。コード片は最小限にし、設計意図やトレードオフ、よくある落とし穴を問う方向で。',
                'deck_name' => 'プログラミング学習',
                'tags' => ['コード', '設計パターン'],
            ],
            'language' => [
                'template_name' => '語学',
                'template_description' => '語学学習向け (英語、中国語など)',
                'domain_hint' => '語彙・文法・表現パターンの定着が目的。意味・用法・類義語との違いを軸に、必要なら短い例文を 1 つだけ添える。',
                'deck_name' => '語学学習',
                'tags' => ['単語', '文法'],
            ],
            'exam' => [
                'template_name' => '資格試験',
                'template_description' => '資格試験対策向け',
                'domain_hint' => '試験頻出知識の効率的な定着が目的。正誤判断の根拠や紛らわしい選択肢の違いを軸に、根拠を 1 文で簡潔に。',
                'deck_name' => '資格試験対策',
                'tags' => ['頻出', '要暗記'],
            ],
            'math_science' => [
                'template_name' => '数学・理系',
                'template_description' => '数学・理系科目向け',
                'domain_hint' => '公式・定理・証明の理解定着が目的。適用条件や導出過程のポイントを問い、数式は正確に扱う。',
                'deck_name' => '数学・理系',
                'tags' => ['公式', '定理'],
            ],
            'business' => [
                'template_name' => 'ビジネス',
                'template_description' => 'ビジネス・経営学習向け',
                'domain_hint' => 'ビジネス概念・フレームワーク・用語の定着が目的。実務での活用イメージを 1 文添える。',
                'deck_name' => 'ビジネス・経営',
                'tags' => ['用語', 'フレームワーク'],
            ],
            'other' => [
                'template_name' => '一般',
                'template_description' => '汎用的な学習テンプレート',
                'domain_hint' => '幅広い分野の知識を定着させる汎用設定。定義・なぜ必要か・具体例を軸に簡潔に。',
                'deck_name' => '一般学習',
                'tags' => [],
            ],
        };
    }
}
