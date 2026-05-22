<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * システム全体の設定を保持するシングルトンテーブル。
 * 1 行のみ (id=1 固定) を運用し、SystemSettingRepository::get() で常に同じ行を参照する。
 *
 * 現状は AI 月次トークン上限のみだが、将来のシステム規模の設定 (デフォルト
 * プロバイダ強制、メンテナンスモード等) もこのテーブルに集約する想定。
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            // null = 無制限。0 以下も無制限として扱う。
            $table->unsignedInteger('monthly_token_limit')->nullable();
            $table->timestamps();
        });

        // 初期行を投入: env 値があればそれをそのまま使い、無ければ null (無制限)
        $envLimit = env('AI_MONTHLY_TOKEN_LIMIT');
        $initial = ($envLimit !== null && $envLimit !== '' && (int) $envLimit > 0)
            ? (int) $envLimit
            : null;

        DB::table('system_settings')->insert([
            'id' => 1,
            'monthly_token_limit' => $initial,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
    }
};
