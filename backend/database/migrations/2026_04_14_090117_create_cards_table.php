<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('deck_id')->constrained()->cascadeOnDelete();
            $table->foreignId('domain_template_id')
                ->nullable()
                ->constrained('domain_templates')
                ->nullOnDelete();
            $table->foreignId('source_note_seed_id')
                ->nullable()
                ->constrained('note_seeds')
                ->nullOnDelete();
            // source_ai_candidate_id は ai_card_candidates テーブル作成時 (Phase 2) に FK 追加
            $table->unsignedBigInteger('source_ai_candidate_id')->nullable();

            $table->text('question');
            $table->text('answer');
            $table->text('explanation')->nullable();
            $table->string('card_type', 50)->default('basic_qa');
            $table->boolean('is_suspended')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'deck_id'], 'idx_cards_user_deck');
            $table->index('source_note_seed_id', 'idx_cards_source_note');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cards');
    }
};
