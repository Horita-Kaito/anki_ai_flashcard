<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\AiCardCandidate;
use App\Models\AiGenerationLog;
use App\Models\Card;
use App\Models\CardReview;
use App\Models\CardSchedule;
use App\Models\Deck;
use App\Models\DomainTemplate;
use App\Models\NoteSeed;
use App\Models\Tag;
use App\Models\User;
use App\Models\UserSetting;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

final class DevelopmentSeeder extends Seeder
{
    /**
     * 開発用デモデータを投入する。
     * 冪等性: 実行前に関連テーブルを truncate する。
     */
    public function run(): void
    {
        $this->truncateAll();

        $user = $this->createUser();
        $this->createUserSetting($user);
        $templates = $this->createDomainTemplates($user);
        $decks = $this->createDecks($user, $templates);
        $tags = $this->createTags($user);
        $noteSeeds = $this->createNoteSeeds($user, $templates);
        $cards = $this->createCards($user, $decks, $tags);
        $this->createCardSchedules($user, $cards);
        $this->createCardReviews($user, $cards);
        $this->createAiGenerationData($user, $noteSeeds);
    }

    private function truncateAll(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        DB::table('card_tag')->truncate();
        CardReview::truncate();
        CardSchedule::truncate();
        AiCardCandidate::truncate();
        AiGenerationLog::truncate();
        Card::truncate();
        NoteSeed::truncate();
        Tag::truncate();
        Deck::truncate();
        DomainTemplate::truncate();
        UserSetting::truncate();
        User::truncate();

        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    private function createUser(): User
    {
        return User::factory()->create([
            'name' => 'テストユーザー',
            'email' => 'test@example.com',
            'password' => Hash::make('password'),
        ]);
    }

    private function createUserSetting(User $user): UserSetting
    {
        return UserSetting::create([
            'user_id' => $user->id,
            'default_domain_template_id' => null,
            'default_ai_provider' => 'openai',
            'default_ai_model' => 'gpt-4o-mini',
            'default_generation_count' => 5,
        ]);
    }

    /**
     * @return array<string, DomainTemplate>
     */
    private function createDomainTemplates(User $user): array
    {
        $definitions = [
            'programming' => [
                'name' => 'プログラミング',
                'description' => 'プログラミング全般の学習用テンプレート',
                'instruction_json' => [
                    'goal' => 'プログラミングの概念・構文・設計パターンを定着させる',
                    'priorities' => ['定義を問う', 'コード例を示す', '使い分けを問う'],
                    'avoid' => ['長文コードの丸暗記'],
                    'preferred_card_types' => ['basic_qa', 'comparison'],
                    'answer_style' => '1-3文で簡潔に。コード片は最小限',
                    'difficulty_policy' => '初中級者向け',
                    'note_interpretation_policy' => 'メモの技術用語を正確に扱う',
                ],
            ],
            'english' => [
                'name' => '英語学習',
                'description' => '英単語・表現の暗記用テンプレート',
                'instruction_json' => [
                    'goal' => '英単語・熟語・表現を定着させる',
                    'priorities' => ['日本語訳を問う', '例文で文脈を示す', '類義語を比較'],
                    'avoid' => ['文法の体系的解説'],
                    'preferred_card_types' => ['basic_qa', 'cloze_like'],
                    'answer_style' => '単語+意味+短い例文',
                    'difficulty_policy' => 'TOEIC 600-800レベル',
                    'note_interpretation_policy' => 'メモ中の英単語リストから個別カードを生成',
                ],
            ],
            'math' => [
                'name' => '数学',
                'description' => '数学の公式・定理・証明の学習用',
                'instruction_json' => [
                    'goal' => '公式・定理とその適用場面を定着させる',
                    'priorities' => ['公式の意味を問う', '適用条件を確認', '具体的な計算例'],
                    'avoid' => ['複雑な証明の丸暗記'],
                    'preferred_card_types' => ['basic_qa', 'practical_case'],
                    'answer_style' => '公式 + 一行説明',
                    'difficulty_policy' => '大学初年度レベル',
                    'note_interpretation_policy' => '数式はLaTeX記法で保持',
                ],
            ],
        ];

        $templates = [];
        foreach ($definitions as $key => $def) {
            $templates[$key] = DomainTemplate::factory()->create([
                'user_id' => $user->id,
                'name' => $def['name'],
                'description' => $def['description'],
                'instruction_json' => $def['instruction_json'],
            ]);
        }

        return $templates;
    }

    /**
     * @param  array<string, DomainTemplate>  $templates
     * @return array<string, Deck>
     */
    private function createDecks(User $user, array $templates): array
    {
        $deckDefs = [
            'laravel' => ['name' => 'Laravel基礎', 'description' => 'Laravelフレームワークの基本概念', 'template' => 'programming', 'order' => 0],
            'typescript' => ['name' => 'TypeScript型', 'description' => 'TypeScriptの型システム', 'template' => 'programming', 'order' => 1],
            'toeic' => ['name' => '英単語TOEIC', 'description' => 'TOEIC頻出英単語', 'template' => 'english', 'order' => 2],
            'algorithm' => ['name' => 'アルゴリズム', 'description' => '基本的なアルゴリズムとデータ構造', 'template' => 'programming', 'order' => 3],
            'design_pattern' => ['name' => 'デザインパターン', 'description' => 'GoFデザインパターン', 'template' => 'programming', 'order' => 4],
        ];

        $decks = [];
        foreach ($deckDefs as $key => $def) {
            $decks[$key] = Deck::factory()->create([
                'user_id' => $user->id,
                'name' => $def['name'],
                'description' => $def['description'],
                'default_domain_template_id' => $templates[$def['template']]->id,
                'display_order' => $def['order'],
            ]);
        }

        return $decks;
    }

    /**
     * @return array<string, Tag>
     */
    private function createTags(User $user): array
    {
        $tagNames = [
            'important' => '重要',
            'must_review' => '復習必須',
            'easy' => '簡単',
            'advanced' => '応用',
            'memorize' => '暗記',
        ];

        $tags = [];
        foreach ($tagNames as $key => $name) {
            $tags[$key] = Tag::factory()->create([
                'user_id' => $user->id,
                'name' => $name,
            ]);
        }

        return $tags;
    }

    /**
     * @param  array<string, DomainTemplate>  $templates
     * @return array<int, NoteSeed>
     */
    private function createNoteSeeds(User $user, array $templates): array
    {
        $noteDefs = [
            ['body' => 'LaravelのService Containerは依存性注入(DI)を管理する仕組み。bindやsingletonでインターフェースと実装を紐付ける。', 'template' => 'programming', 'subdomain' => 'Laravel', 'goal' => 'DIコンテナの基本を理解する'],
            ['body' => 'Eloquentのリレーション: hasOne, hasMany, belongsTo, belongsToMany。多対多はピボットテーブルが必要。', 'template' => 'programming', 'subdomain' => 'Laravel', 'goal' => 'リレーションの使い分けを覚える'],
            ['body' => 'TypeScriptのunion型(A | B)とintersection型(A & B)の違い。unionはどちらか、intersectionは両方の性質を持つ。', 'template' => 'programming', 'subdomain' => 'TypeScript', 'goal' => '型演算子を区別できるようにする'],
            ['body' => 'ジェネリクス<T>を使うと型安全な汎用関数が書ける。constraintsでTの範囲を制限可能。', 'template' => 'programming', 'subdomain' => 'TypeScript', 'goal' => 'ジェネリクスの活用場面を理解する'],
            ['body' => 'implement(実装する), comprehend(理解する), distinguish(区別する), elaborate(詳しく述べる), facilitate(促進する)', 'template' => 'english', 'subdomain' => 'TOEIC語彙', 'goal' => 'TOEIC頻出動詞を覚える'],
            ['body' => 'despite(にもかかわらず), whereas(一方で), nevertheless(それにもかかわらず), furthermore(さらに)', 'template' => 'english', 'subdomain' => 'TOEIC語彙', 'goal' => '接続表現を覚える'],
            ['body' => '二分探索: ソート済み配列でO(log n)で検索。毎回中央と比較して探索範囲を半分に。', 'template' => 'programming', 'subdomain' => 'アルゴリズム', 'goal' => '二分探索の計算量と条件を理解する'],
            ['body' => 'スタックはLIFO、キューはFIFO。スタック→再帰・Undo、キュー→BFS・タスクキュー。', 'template' => 'programming', 'subdomain' => 'データ構造', 'goal' => 'スタックとキューの使い分け'],
            ['body' => 'Strategyパターン: アルゴリズムをインターフェースで抽象化し、実行時に差し替え可能にする。', 'template' => 'programming', 'subdomain' => 'デザインパターン', 'goal' => 'Strategyパターンの目的と構造を理解する'],
            ['body' => 'Observerパターン: 状態変化を通知。Subject(発行者)とObserver(購読者)の1対多。LaravelのEventはこれ。', 'template' => 'programming', 'subdomain' => 'デザインパターン', 'goal' => 'Observerパターンの実例を把握する'],
        ];

        $noteSeeds = [];
        foreach ($noteDefs as $def) {
            $noteSeeds[] = NoteSeed::factory()->create([
                'user_id' => $user->id,
                'body' => $def['body'],
                'domain_template_id' => $templates[$def['template']]->id,
                'subdomain' => $def['subdomain'],
                'learning_goal' => $def['goal'],
            ]);
        }

        return $noteSeeds;
    }

    /**
     * @param  array<string, Deck>  $decks
     * @param  array<string, Tag>  $tags
     * @return array<int, Card>
     */
    private function createCards(User $user, array $decks, array $tags): array
    {
        $cardDefs = [
            // Laravel基礎 (4 cards)
            ['deck' => 'laravel', 'q' => 'LaravelのService Containerの役割は何ですか？', 'a' => '依存性注入(DI)を管理する仕組み。クラスの依存関係を自動的に解決し、インターフェースと実装の紐付けを行う。', 'type' => 'basic_qa', 'tags' => ['important']],
            ['deck' => 'laravel', 'q' => 'Eloquentのbind()とsingleton()の違いは？', 'a' => 'bind()は呼び出すたびに新しいインスタンスを生成する。singleton()は最初の1回だけインスタンスを生成し、以降は同じインスタンスを返す。', 'type' => 'comparison', 'tags' => ['important', 'must_review']],
            ['deck' => 'laravel', 'q' => 'hasMany と belongsToMany の違いを説明してください。', 'a' => 'hasManyは1対多のリレーション(外部キーが子テーブルにある)。belongsToManyは多対多のリレーション(中間ピボットテーブルが必要)。', 'type' => 'comparison', 'tags' => []],
            ['deck' => 'laravel', 'q' => 'FormRequestクラスを使う利点は何ですか？', 'a' => 'バリデーションロジックをControllerから分離でき、再利用性が高まる。authorize()メソッドで認可も同時に行える。', 'type' => 'basic_qa', 'tags' => ['easy']],

            // TypeScript型 (4 cards)
            ['deck' => 'typescript', 'q' => 'TypeScriptのunion型とintersection型の違いは？', 'a' => 'union型(A | B)はAまたはBのいずれか。intersection型(A & B)はAとB両方の性質を持つ型。', 'type' => 'comparison', 'tags' => ['important']],
            ['deck' => 'typescript', 'q' => 'ジェネリクスの型制約(constraints)はどのように書きますか？', 'a' => '<T extends SomeType>のように書く。Tが持つべき最低限のインターフェースを指定できる。', 'type' => 'basic_qa', 'tags' => ['advanced']],
            ['deck' => 'typescript', 'q' => 'TypeScriptのtype aliasとinterfaceの主な違いは？', 'a' => 'interfaceは宣言マージ(同名で拡張)が可能。type aliasはunionやintersectionなど複雑な型表現が可能。オブジェクト型の定義はどちらでも可能。', 'type' => 'comparison', 'tags' => ['must_review']],
            ['deck' => 'typescript', 'q' => 'unknown型とany型の違いは何ですか？', 'a' => 'anyは型チェックを完全にスキップする。unknownは型安全なany。使用する前に型ガードでの絞り込みが必要。', 'type' => 'comparison', 'tags' => ['important', 'memorize']],

            // 英単語TOEIC (4 cards)
            ['deck' => 'toeic', 'q' => '"implement" の意味と例文を答えてください。', 'a' => '意味: 実装する、実行する。例: We need to implement the new policy by next month.', 'type' => 'basic_qa', 'tags' => ['memorize']],
            ['deck' => 'toeic', 'q' => '"despite" と "although" の違いは？', 'a' => 'despiteは前置詞で名詞/動名詞が続く。althoughは接続詞で節(S+V)が続く。意味はどちらも「にもかかわらず」。', 'type' => 'comparison', 'tags' => ['easy']],
            ['deck' => 'toeic', 'q' => 'The project was delayed, _____ the team worked overtime. (nevertheless / furthermore)', 'a' => 'nevertheless (それにもかかわらず)。furthermoreは「さらに」で追加情報を示す。', 'type' => 'cloze_like', 'tags' => []],
            ['deck' => 'toeic', 'q' => '"facilitate" の意味は？', 'a' => '促進する、容易にする。例: The software facilitates communication between teams.', 'type' => 'basic_qa', 'tags' => ['memorize']],

            // アルゴリズム (4 cards)
            ['deck' => 'algorithm', 'q' => '二分探索の時間計算量と前提条件は？', 'a' => '時間計算量: O(log n)。前提条件: 配列がソート済みであること。', 'type' => 'basic_qa', 'tags' => ['important', 'must_review']],
            ['deck' => 'algorithm', 'q' => 'スタック(LIFO)の代表的な用途を2つ挙げてください。', 'a' => '1. 再帰処理のコールスタック 2. Undo機能の操作履歴', 'type' => 'basic_qa', 'tags' => []],
            ['deck' => 'algorithm', 'q' => 'BFS(幅優先探索)とDFS(深さ優先探索)のデータ構造の違いは？', 'a' => 'BFSはキュー(FIFO)を使用。DFSはスタック(LIFO)または再帰を使用。', 'type' => 'comparison', 'tags' => ['advanced']],
            ['deck' => 'algorithm', 'q' => 'ハッシュテーブルの平均探索時間計算量は？', 'a' => 'O(1)。ただし衝突(collision)が多いとO(n)に劣化する。', 'type' => 'basic_qa', 'tags' => ['easy']],

            // デザインパターン (4 cards)
            ['deck' => 'design_pattern', 'q' => 'Strategyパターンの目的を説明してください。', 'a' => 'アルゴリズムをインターフェースで抽象化し、クライアントコードを変更せずに実行時にアルゴリズムを差し替え可能にする。', 'type' => 'basic_qa', 'tags' => ['important']],
            ['deck' => 'design_pattern', 'q' => 'ObserverパターンのSubjectとObserverの関係は？', 'a' => '1対多の関係。Subjectの状態変化を複数のObserverに自動通知する。LaravelのEventシステムが典型例。', 'type' => 'basic_qa', 'tags' => ['must_review']],
            ['deck' => 'design_pattern', 'q' => 'Singletonパターンの問題点は？', 'a' => 'グローバル状態を作るためテスト困難。密結合を招きやすい。マルチスレッド環境での安全な実装が複雑。', 'type' => 'basic_qa', 'tags' => ['advanced', 'important']],
            ['deck' => 'design_pattern', 'q' => 'FactoryパターンとAbstract Factoryパターンの違いは？', 'a' => 'Factoryは単一の製品を生成。Abstract Factoryは関連する製品群(ファミリー)をまとめて生成するインターフェースを提供。', 'type' => 'comparison', 'tags' => ['advanced']],
        ];

        $cards = [];
        foreach ($cardDefs as $def) {
            /** @var Card $card */
            $card = Card::factory()->create([
                'user_id' => $user->id,
                'deck_id' => $decks[$def['deck']]->id,
                'question' => $def['q'],
                'answer' => $def['a'],
                'card_type' => $def['type'],
                'is_suspended' => false,
            ]);

            if (! empty($def['tags'])) {
                $tagIds = array_map(fn (string $key) => $tags[$key]->id, $def['tags']);
                $card->tags()->attach($tagIds);
            }

            $cards[] = $card;
        }

        return $cards;
    }

    /**
     * @param  array<int, Card>  $cards
     */
    private function createCardSchedules(User $user, array $cards): void
    {
        $now = Carbon::now();

        $schedules = [
            // New cards (no reviews yet)
            ['index' => 0, 'state' => 'new', 'repetitions' => 0, 'interval' => 0, 'ease' => 2.50, 'due' => $now, 'last_reviewed' => null, 'lapses' => 0],
            ['index' => 4, 'state' => 'new', 'repetitions' => 0, 'interval' => 0, 'ease' => 2.50, 'due' => $now, 'last_reviewed' => null, 'lapses' => 0],
            ['index' => 8, 'state' => 'new', 'repetitions' => 0, 'interval' => 0, 'ease' => 2.50, 'due' => $now, 'last_reviewed' => null, 'lapses' => 0],

            // Learning cards (recently started)
            ['index' => 1, 'state' => 'learning', 'repetitions' => 1, 'interval' => 1, 'ease' => 2.50, 'due' => $now->copy()->addMinutes(10), 'last_reviewed' => $now->copy()->subMinutes(5), 'lapses' => 0],
            ['index' => 5, 'state' => 'learning', 'repetitions' => 1, 'interval' => 1, 'ease' => 2.36, 'due' => $now->copy()->addHours(1), 'last_reviewed' => $now->copy()->subMinutes(30), 'lapses' => 0],

            // Review cards (due today)
            ['index' => 2, 'state' => 'review', 'repetitions' => 5, 'interval' => 7, 'ease' => 2.60, 'due' => $now->copy()->subHours(2), 'last_reviewed' => $now->copy()->subDays(7), 'lapses' => 0],
            ['index' => 6, 'state' => 'review', 'repetitions' => 3, 'interval' => 4, 'ease' => 2.50, 'due' => $now, 'last_reviewed' => $now->copy()->subDays(4), 'lapses' => 1],
            ['index' => 9, 'state' => 'review', 'repetitions' => 8, 'interval' => 21, 'ease' => 2.80, 'due' => $now->copy()->addDays(2), 'last_reviewed' => $now->copy()->subDays(21), 'lapses' => 0],

            // Review cards (due in the future)
            ['index' => 3, 'state' => 'review', 'repetitions' => 10, 'interval' => 30, 'ease' => 2.70, 'due' => $now->copy()->addDays(15), 'last_reviewed' => $now->copy()->subDays(15), 'lapses' => 0],
            ['index' => 12, 'state' => 'review', 'repetitions' => 4, 'interval' => 10, 'ease' => 2.50, 'due' => $now->copy()->addDays(5), 'last_reviewed' => $now->copy()->subDays(5), 'lapses' => 0],

            // Relearning card (lapsed)
            ['index' => 7, 'state' => 'relearning', 'repetitions' => 3, 'interval' => 1, 'ease' => 2.10, 'due' => $now->copy()->addMinutes(10), 'last_reviewed' => $now->copy()->subMinutes(5), 'lapses' => 2],

            // More review cards spread across decks
            ['index' => 10, 'state' => 'review', 'repetitions' => 2, 'interval' => 3, 'ease' => 2.50, 'due' => $now->copy()->addDay(), 'last_reviewed' => $now->copy()->subDays(3), 'lapses' => 0],
            ['index' => 13, 'state' => 'review', 'repetitions' => 6, 'interval' => 14, 'ease' => 2.65, 'due' => $now->copy()->addDays(7), 'last_reviewed' => $now->copy()->subDays(7), 'lapses' => 0],
            ['index' => 16, 'state' => 'new', 'repetitions' => 0, 'interval' => 0, 'ease' => 2.50, 'due' => $now, 'last_reviewed' => null, 'lapses' => 0],
            ['index' => 17, 'state' => 'learning', 'repetitions' => 2, 'interval' => 1, 'ease' => 2.50, 'due' => $now->copy()->addMinutes(30), 'last_reviewed' => $now->copy()->subMinutes(10), 'lapses' => 0],
        ];

        foreach ($schedules as $s) {
            if (! isset($cards[$s['index']])) {
                continue;
            }

            CardSchedule::create([
                'user_id' => $user->id,
                'card_id' => $cards[$s['index']]->id,
                'state' => $s['state'],
                'repetitions' => $s['repetitions'],
                'interval_days' => $s['interval'],
                'ease_factor' => $s['ease'],
                'due_at' => $s['due'],
                'last_reviewed_at' => $s['last_reviewed'],
                'lapse_count' => $s['lapses'],
            ]);
        }
    }

    /**
     * @param  array<int, Card>  $cards
     */
    private function createCardReviews(User $user, array $cards): void
    {
        $now = Carbon::now();

        $reviews = [
            // Card at index 2 was reviewed a week ago (good)
            [
                'card_index' => 2,
                'reviewed_at' => $now->copy()->subDays(7),
                'rating' => 'good',
                'scheduled_due_at' => $now->copy()->subDays(7),
                'actual_interval_days' => 7,
                'response_time_ms' => 3200,
                'schedule_snapshot_json' => ['repetitions' => 4, 'interval_days' => 4, 'ease_factor' => 2.60],
            ],
            // Card at index 6 was reviewed 4 days ago (hard, caused a lapse)
            [
                'card_index' => 6,
                'reviewed_at' => $now->copy()->subDays(4),
                'rating' => 'hard',
                'scheduled_due_at' => $now->copy()->subDays(5),
                'actual_interval_days' => 4,
                'response_time_ms' => 8500,
                'schedule_snapshot_json' => ['repetitions' => 2, 'interval_days' => 3, 'ease_factor' => 2.50],
            ],
            // Card at index 9 was reviewed 21 days ago (easy)
            [
                'card_index' => 9,
                'reviewed_at' => $now->copy()->subDays(21),
                'rating' => 'easy',
                'scheduled_due_at' => $now->copy()->subDays(21),
                'actual_interval_days' => 14,
                'response_time_ms' => 1800,
                'schedule_snapshot_json' => ['repetitions' => 7, 'interval_days' => 14, 'ease_factor' => 2.80],
            ],
        ];

        foreach ($reviews as $r) {
            CardReview::create([
                'user_id' => $user->id,
                'card_id' => $cards[$r['card_index']]->id,
                'reviewed_at' => $r['reviewed_at'],
                'rating' => $r['rating'],
                'scheduled_due_at' => $r['scheduled_due_at'],
                'actual_interval_days' => $r['actual_interval_days'],
                'response_time_ms' => $r['response_time_ms'],
                'schedule_snapshot_json' => $r['schedule_snapshot_json'],
            ]);
        }
    }

    /**
     * @param  array<int, NoteSeed>  $noteSeeds
     */
    private function createAiGenerationData(User $user, array $noteSeeds): void
    {
        // Create an AI generation log for the first note seed
        $generationLog = AiGenerationLog::create([
            'user_id' => $user->id,
            'note_seed_id' => $noteSeeds[0]->id,
            'provider' => 'openai',
            'model_name' => 'gpt-4o-mini',
            'prompt_version' => 'v1.0',
            'input_tokens' => 320,
            'output_tokens' => 580,
            'cost_usd' => 0.000450,
            'duration_ms' => 2340,
            'status' => 'success',
            'error_reason' => null,
            'candidates_count' => 3,
        ]);

        // 3 AI card candidates: adopted, pending, rejected
        $candidates = [
            [
                'question' => 'LaravelのService Containerでbind()メソッドは何をしますか？',
                'answer' => 'インターフェースと具象クラスの紐付けを登録する。解決時に毎回新しいインスタンスが生成される。',
                'status' => 'adopted',
                'confidence' => 0.92,
                'focus_type' => 'definition',
                'rationale' => 'DIコンテナの基本操作であるbindの動作を問う。メモに直接記載された内容。',
            ],
            [
                'question' => 'singleton()で登録したサービスの特徴は何ですか？',
                'answer' => 'アプリケーション全体で同一のインスタンスが共有される。最初の解決時にのみインスタンスが生成される。',
                'status' => 'pending',
                'confidence' => 0.88,
                'focus_type' => 'definition',
                'rationale' => 'bind()との対比でsingleton()の挙動を問う。メモのbind/singletonの記述に基づく。',
            ],
            [
                'question' => '依存性注入(DI)を使わずにクラス内でnewする場合の問題点は？',
                'answer' => 'テスト時にモック差し替えが困難になり、クラス間の結合度が高くなる。',
                'status' => 'rejected',
                'confidence' => 0.71,
                'focus_type' => 'why',
                'rationale' => 'DIの必要性を逆説的に問う。ただしメモの範囲を超えている可能性あり。',
            ],
        ];

        foreach ($candidates as $c) {
            AiCardCandidate::factory()->create([
                'user_id' => $user->id,
                'note_seed_id' => $noteSeeds[0]->id,
                'ai_generation_log_id' => $generationLog->id,
                'provider' => 'openai',
                'model_name' => 'gpt-4o-mini',
                'question' => $c['question'],
                'answer' => $c['answer'],
                'card_type' => 'basic_qa',
                'focus_type' => $c['focus_type'],
                'rationale' => $c['rationale'],
                'confidence' => $c['confidence'],
                'status' => $c['status'],
            ]);
        }
    }
}
