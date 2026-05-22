<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_generation_logs', function (Blueprint $table) {
            // 親子関係: 親ログ (chunks_total = N, chunk_index = null)
            //           子ログ (parent_log_id = 親, chunk_index = 0..N-1)
            // 単一チャンクの場合は parent_log_id = null, chunks_total = null のまま
            $table->foreignId('parent_log_id')
                ->nullable()
                ->after('note_seed_id')
                ->constrained('ai_generation_logs')
                ->nullOnDelete();
            $table->unsignedInteger('chunk_index')->nullable()->after('parent_log_id');
            $table->unsignedInteger('chunks_total')->nullable()->after('chunk_index');

            $table->index(['parent_log_id', 'chunk_index'], 'idx_ai_logs_parent_chunk');
        });
    }

    public function down(): void
    {
        Schema::table('ai_generation_logs', function (Blueprint $table) {
            $table->dropIndex('idx_ai_logs_parent_chunk');
            $table->dropConstrainedForeignId('parent_log_id');
            $table->dropColumn(['chunk_index', 'chunks_total']);
        });
    }
};
