<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('chat_sessions', function (Blueprint $table) {
            $table->timestamp('materialized_at')->nullable()->after('deck_id');
            $table->index(['user_id', 'materialized_at'], 'idx_chat_sessions_user_materialized');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('chat_sessions', function (Blueprint $table) {
            $table->dropIndex('idx_chat_sessions_user_materialized');
            $table->dropColumn('materialized_at');
        });
    }
};
