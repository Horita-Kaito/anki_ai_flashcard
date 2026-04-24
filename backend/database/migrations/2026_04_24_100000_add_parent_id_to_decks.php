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
            // Adjacency List 方式の自己参照 FK。
            // 子デッキが残っているうちは削除させない (restrictOnDelete)。
            $table->foreignId('parent_id')
                ->nullable()
                ->after('user_id')
                ->constrained('decks')
                ->restrictOnDelete();

            // (user_id, parent_id, display_order) で兄弟内の並び順を効率的に取得
            $table->index(
                ['user_id', 'parent_id', 'display_order'],
                'idx_decks_user_parent_order'
            );
        });
    }

    public function down(): void
    {
        Schema::table('decks', function (Blueprint $table) {
            $table->dropIndex('idx_decks_user_parent_order');
            $table->dropConstrainedForeignId('parent_id');
        });
    }
};
