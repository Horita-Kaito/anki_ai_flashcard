<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->unique()
                ->constrained()
                ->cascadeOnDelete();
            $table->foreignId('default_domain_template_id')
                ->nullable()
                ->constrained('domain_templates')
                ->nullOnDelete();
            $table->unsignedInteger('daily_new_limit')->default(20);
            $table->unsignedInteger('daily_review_limit')->default(100);
            $table->string('default_ai_provider', 50)->default('openai');
            $table->string('default_ai_model', 100)->default('gpt-4o-mini');
            $table->unsignedInteger('default_generation_count')->default(3);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_settings');
    }
};
