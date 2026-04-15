<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('card_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('card_id')->constrained()->cascadeOnDelete();
            $table->timestamp('reviewed_at');
            $table->string('rating', 10); // again | hard | good | easy
            $table->timestamp('scheduled_due_at')->nullable();
            $table->integer('actual_interval_days')->nullable();
            $table->unsignedInteger('response_time_ms')->nullable();
            $table->json('schedule_snapshot_json')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'reviewed_at'], 'idx_reviews_user_date');
            $table->index(['user_id', 'card_id'], 'idx_reviews_user_card');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('card_reviews');
    }
};
