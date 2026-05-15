<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * テンプレートを「分野ヒント (AI に渡す自由文 1 行)」へ簡素化する。
     *
     * 旧 instruction_json は 7 フィールドの JSON で、AI への効果がぼんやりしており
     * 入力負荷だけが大きかった (検討経緯: 本タスクで議論済み)。
     * goal 以外は system prompt 側 (策問の原則 + 2 視点同時解釈) でカバー済みのため
     * goal だけを保持して残りは捨てる。
     */
    public function up(): void
    {
        Schema::table('domain_templates', function (Blueprint $table) {
            $table->text('domain_hint')->nullable()->after('description');
        });

        // 既存データを移行: instruction_json.goal → domain_hint。
        // goal が未設定 / 空白だけ / 非文字列の場合は null として書き戻す
        // (新方式では「空 hint = 分野ポリシーブロックを出さない」が正しい挙動)。
        DB::table('domain_templates')
            ->orderBy('id')
            ->chunkById(200, function ($templates) {
                foreach ($templates as $template) {
                    $json = is_string($template->instruction_json)
                        ? (json_decode($template->instruction_json, true) ?: [])
                        : [];
                    $hint = is_string($json['goal'] ?? null) && trim($json['goal']) !== ''
                        ? trim($json['goal'])
                        : null;

                    DB::table('domain_templates')
                        ->where('id', $template->id)
                        ->update(['domain_hint' => $hint]);
                }
            });

        Schema::table('domain_templates', function (Blueprint $table) {
            $table->dropColumn('instruction_json');
        });
    }

    public function down(): void
    {
        Schema::table('domain_templates', function (Blueprint $table) {
            $table->json('instruction_json')->nullable()->after('description');
        });

        // 戻し: domain_hint → instruction_json.goal だけを書き戻す (他フィールドは復元できない)
        DB::table('domain_templates')
            ->orderBy('id')
            ->chunkById(200, function ($templates) {
                foreach ($templates as $template) {
                    $payload = $template->domain_hint !== null
                        ? ['goal' => $template->domain_hint]
                        : [];

                    DB::table('domain_templates')
                        ->where('id', $template->id)
                        ->update(['instruction_json' => json_encode($payload, JSON_UNESCAPED_UNICODE)]);
                }
            });

        Schema::table('domain_templates', function (Blueprint $table) {
            $table->dropColumn('domain_hint');
        });
    }
};
