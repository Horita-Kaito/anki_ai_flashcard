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
            $table->dropColumn(['new_cards_limit', 'review_limit']);
        });
    }

    public function down(): void
    {
        Schema::table('decks', function (Blueprint $table) {
            $table->unsignedInteger('new_cards_limit')->default(20);
            $table->unsignedInteger('review_limit')->nullable();
        });
    }
};
