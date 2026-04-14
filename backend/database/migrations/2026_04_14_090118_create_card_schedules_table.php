<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('card_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('card_id')->constrained()->cascadeOnDelete();

            $table->unsignedInteger('repetitions')->default(0);
            $table->unsignedInteger('interval_days')->default(0);
            $table->decimal('ease_factor', 4, 2)->default(2.50);
            $table->timestamp('due_at')->useCurrent();
            $table->timestamp('last_reviewed_at')->nullable();
            $table->unsignedInteger('lapse_count')->default(0);
            $table->string('state', 20)->default('new');
            $table->timestamps();

            $table->unique('card_id', 'uq_schedules_card');
            $table->index(['user_id', 'due_at'], 'idx_schedules_user_due');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('card_schedules');
    }
};
