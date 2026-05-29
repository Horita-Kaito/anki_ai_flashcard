<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_cardization_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('source_chat_session_id')
                ->nullable()
                ->constrained('chat_sessions')
                ->nullOnDelete();
            $table->string('source_chat_session_title')->nullable();
            $table->foreignId('domain_template_id')
                ->nullable()
                ->constrained('domain_templates')
                ->nullOnDelete();
            $table->foreignId('deck_id')
                ->nullable()
                ->constrained('decks')
                ->nullOnDelete();
            $table->unsignedInteger('notes_count')->default(0);
            $table->unsignedInteger('dispatched_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->string('status')->default('completed');
            $table->timestamps();

            $table->index(['user_id', 'created_at'], 'idx_chat_card_batches_user_created');
            $table->index(['user_id', 'status'], 'idx_chat_card_batches_user_status');
        });

        Schema::create('chat_cardization_batch_note_seed', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('chat_cardization_batch_id');
            $table->foreignId('note_seed_id');
            $table->foreignId('ai_generation_log_id')->nullable();
            $table->string('generation_status')->default('queued');
            $table->text('failure_reason')->nullable();
            $table->timestamps();

            $table->unique(
                ['chat_cardization_batch_id', 'note_seed_id'],
                'uniq_chat_card_batch_note_seed',
            );
            $table->index(['user_id', 'created_at'], 'idx_chat_card_batch_notes_user_created');
            $table->index(['note_seed_id', 'chat_cardization_batch_id'], 'idx_chat_card_batch_notes_note');
            $table->foreign('chat_cardization_batch_id', 'fk_chat_card_batch_notes_batch')
                ->references('id')
                ->on('chat_cardization_batches')
                ->cascadeOnDelete();
            $table->foreign('note_seed_id', 'fk_chat_card_batch_notes_note')
                ->references('id')
                ->on('note_seeds')
                ->cascadeOnDelete();
            $table->foreign('ai_generation_log_id', 'fk_chat_card_batch_notes_log')
                ->references('id')
                ->on('ai_generation_logs')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_cardization_batch_note_seed');
        Schema::dropIfExists('chat_cardization_batches');
    }
};
