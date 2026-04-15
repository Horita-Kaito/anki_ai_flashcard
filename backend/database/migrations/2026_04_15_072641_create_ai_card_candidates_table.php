<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_card_candidates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('note_seed_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ai_generation_log_id')
                ->nullable()
                ->constrained('ai_generation_logs')
                ->nullOnDelete();

            $table->string('provider', 50);
            $table->string('model_name', 100);

            $table->text('question');
            $table->text('answer');
            $table->string('card_type', 50)->default('basic_qa');
            $table->string('focus_type', 50)->nullable();
            $table->text('rationale')->nullable();
            $table->decimal('confidence', 3, 2)->nullable();
            $table->string('status', 20)->default('pending'); // pending | adopted | rejected
            $table->json('raw_response')->nullable();

            $table->timestamps();

            $table->index(['note_seed_id', 'status'], 'idx_candidates_note_status');
            $table->index(['user_id', 'created_at'], 'idx_candidates_user_created');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_card_candidates');
    }
};
