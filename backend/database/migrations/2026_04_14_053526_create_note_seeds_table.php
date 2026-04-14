<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('note_seeds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->foreignId('domain_template_id')
                ->nullable()
                ->constrained('domain_templates')
                ->nullOnDelete();
            $table->string('subdomain')->nullable();
            $table->text('learning_goal')->nullable();
            $table->text('note_context')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at'], 'idx_note_seeds_user_created');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('note_seeds');
    }
};
