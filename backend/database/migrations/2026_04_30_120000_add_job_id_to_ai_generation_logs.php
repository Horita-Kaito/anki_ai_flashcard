<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * AI 生成を非同期化するため job_id を追加。
 * status に 'queued' / 'processing' を追加 (varchar 型なので enum 変更は不要)。
 * 進行中の生成を高速に検索できるよう (status, note_seed_id) のインデックスも追加。
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_generation_logs', function (Blueprint $table) {
            $table->string('job_id', 100)->nullable()->after('status');
            $table->index(['note_seed_id', 'status'], 'idx_ai_logs_note_status');
        });
    }

    public function down(): void
    {
        Schema::table('ai_generation_logs', function (Blueprint $table) {
            $table->dropIndex('idx_ai_logs_note_status');
            $table->dropColumn('job_id');
        });
    }
};
