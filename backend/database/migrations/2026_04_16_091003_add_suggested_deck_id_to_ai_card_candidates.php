<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_card_candidates', function (Blueprint $table) {
            $table->foreignId('suggested_deck_id')
                ->nullable()
                ->after('confidence')
                ->constrained('decks')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('ai_card_candidates', function (Blueprint $table) {
            $table->dropConstrainedForeignId('suggested_deck_id');
        });
    }
};
