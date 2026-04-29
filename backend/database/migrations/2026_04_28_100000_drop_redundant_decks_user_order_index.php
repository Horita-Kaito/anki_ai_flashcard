<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `idx_decks_user_order (user_id, display_order)` は
 * `idx_decks_user_parent_order (user_id, parent_id, display_order)` の leftmost prefix に含まれるため冗長。
 * 削除して書き込み時の index メンテナンスコストを下げる。
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('decks', function (Blueprint $table): void {
            $indexes = collect(Schema::getIndexes('decks'))
                ->pluck('name')
                ->all();

            if (in_array('idx_decks_user_order', $indexes, true)) {
                $table->dropIndex('idx_decks_user_order');
            }
        });
    }

    public function down(): void
    {
        Schema::table('decks', function (Blueprint $table): void {
            $table->index(['user_id', 'display_order'], 'idx_decks_user_order');
        });
    }
};
