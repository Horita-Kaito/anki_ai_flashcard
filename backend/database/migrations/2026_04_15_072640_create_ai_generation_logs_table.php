<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * AI 生成の 1 回ごとの呼び出しログ。
 * 成功/失敗、トークン数、コスト、所要時間を記録する。
 * 失敗時も記録 (無駄打ちでも課金されるため)。
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_generation_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('note_seed_id')
                ->nullable()
                ->constrained('note_seeds')
                ->nullOnDelete();

            $table->string('provider', 50);
            $table->string('model_name', 100);
            $table->string('prompt_version', 20);

            $table->unsignedInteger('input_tokens')->default(0);
            $table->unsignedInteger('output_tokens')->default(0);
            $table->decimal('cost_usd', 10, 6)->default(0);
            $table->unsignedInteger('duration_ms')->default(0);

            $table->string('status', 20); // success | failed
            $table->text('error_reason')->nullable();
            $table->unsignedInteger('candidates_count')->default(0);

            $table->timestamps();

            $table->index(['user_id', 'created_at'], 'idx_ai_logs_user_created');
            $table->index('note_seed_id', 'idx_ai_logs_note_seed');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_generation_logs');
    }
};
