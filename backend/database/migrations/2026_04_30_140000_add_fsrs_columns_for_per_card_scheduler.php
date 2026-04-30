<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * カード単位で復習アルゴリズム (SM-2 / FSRS) を選択可能にするためのスキーマ追加。
 * 既存カードは sm2 のまま、新規カードは fsrs がデフォルト (アプリケーション層)。
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cards', function (Blueprint $table) {
            // 'sm2' | 'fsrs'
            $table->string('scheduler', 10)->default('sm2')->after('card_type');
        });

        Schema::table('card_schedules', function (Blueprint $table) {
            // FSRS 状態 (sm2 カードでは null のまま)
            // stability: 想起可能日数 (時間が経つほど忘れる)
            $table->decimal('stability', 10, 4)->nullable()->after('ease_factor');
            // difficulty: 1.0〜10.0 のスカラー (高いほど忘れやすい)
            $table->decimal('difficulty', 4, 2)->nullable()->after('stability');
        });

        Schema::table('user_settings', function (Blueprint $table) {
            // FSRS 用: 目標想起率 (デフォルト 0.9 = 復習時に 90% の確率で想起できる間隔を狙う)
            $table->decimal('desired_retention', 4, 3)->default(0.900)->after('default_generation_count');
        });
    }

    public function down(): void
    {
        Schema::table('user_settings', function (Blueprint $table) {
            $table->dropColumn('desired_retention');
        });

        Schema::table('card_schedules', function (Blueprint $table) {
            $table->dropColumn(['stability', 'difficulty']);
        });

        Schema::table('cards', function (Blueprint $table) {
            $table->dropColumn('scheduler');
        });
    }
};
