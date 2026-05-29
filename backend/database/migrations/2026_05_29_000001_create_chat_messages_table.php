<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('chat_session_id')->constrained()->cascadeOnDelete();
            $table->string('role', 16);
            $table->text('content');
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'chat_session_id', 'created_at'], 'idx_chat_messages_user_session_created');
            $table->index(['chat_session_id', 'created_at'], 'idx_chat_messages_session_created');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_messages');
    }
};
