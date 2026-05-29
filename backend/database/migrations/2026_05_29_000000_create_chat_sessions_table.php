<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title')->nullable();
            $table->foreignId('domain_template_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();
            $table->foreignId('deck_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();
            $table->timestamps();

            $table->index(['user_id', 'created_at'], 'idx_chat_sessions_user_created');
            $table->index(['user_id', 'domain_template_id'], 'idx_chat_sessions_user_template');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_sessions');
    }
};
