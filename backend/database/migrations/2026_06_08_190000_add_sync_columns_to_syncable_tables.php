<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 端末間オプトイン同期のためのスキーマ。
 *
 * 同期対象テーブルへ:
 *   - client_id          : iOS(SwiftData) の UUID。跨デバイスの安定キー。(user_id, client_id) を UNIQUE。
 *   - client_updated_at  : クライアント論理更新時刻。競合解決(Last-Write-Wins)の比較に使う。
 *
 * 削除は SoftDeletes を使わず、専用 sync_tombstones テーブルで扱う。
 * これにより既存 Web の物理削除・FKカスケード・テストの挙動を一切変えずに、
 * 削除を端末間へ伝播できる。pull のカーソルはサーバ updated_at(壁時計, ミリ秒)。
 * 既存カラムは変更せず追加のみ（Web/Backend と後方互換）。
 */
return new class extends Migration
{
    /** @var array<int, string> */
    private array $tables = [
        'decks',
        'note_seeds',
        'ai_card_candidates',
        'cards',
        'card_schedules',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                $blueprint->char('client_id', 36)->nullable()->after('id');
                $blueprint->timestamp('client_updated_at')->nullable()->after('updated_at');

                $blueprint->unique(['user_id', 'client_id'], "idx_{$table}_user_client");
            });
        }

        Schema::create('sync_tombstones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('entity', 40);
            $table->char('client_id', 36);
            // クライアント論理削除時刻（LWW 比較用）。
            $table->timestamp('client_updated_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'entity', 'client_id'], 'idx_tombstones_user_entity_client');
            // pull の差分取得用（updated_at で since 以降を引く）。
            $table->index(['user_id', 'updated_at'], 'idx_tombstones_user_updated');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_tombstones');

        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                $blueprint->dropUnique("idx_{$table}_user_client");
                $blueprint->dropColumn(['client_id', 'client_updated_at']);
            });
        }
    }
};
