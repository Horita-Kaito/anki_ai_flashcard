<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('decks', function (Blueprint $table) {
            $table->unsignedInteger('display_order')->default(0)->after('review_limit');
            $table->index(['user_id', 'display_order'], 'idx_decks_user_order');
        });
    }

    public function down(): void
    {
        Schema::table('decks', function (Blueprint $table) {
            $table->dropIndex('idx_decks_user_order');
            $table->dropColumn('display_order');
        });
    }
};
