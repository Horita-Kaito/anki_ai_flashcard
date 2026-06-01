<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_card_candidates', function (Blueprint $table) {
            $table->char('question_fingerprint', 64)
                ->nullable()
                ->after('question');
        });

        DB::statement(<<<'SQL'
            CREATE TEMPORARY TABLE migration_ai_candidate_fingerprints (
                user_id BIGINT NOT NULL,
                note_seed_id BIGINT NOT NULL,
                question_fingerprint CHAR(64) NOT NULL,
                PRIMARY KEY (user_id, note_seed_id, question_fingerprint)
            )
            SQL);

        try {
            DB::table('ai_card_candidates')
                ->whereIn('status', ['pending', 'adopted'])
                ->orderBy('id')
                ->select(['id', 'user_id', 'note_seed_id', 'question'])
                ->chunkById(500, function ($candidates): void {
                    foreach ($candidates as $candidate) {
                        $normalized = mb_strtolower((string) preg_replace(
                            '/[\s[:punct:]]+/u',
                            '',
                            trim((string) $candidate->question),
                        ));
                        if ($normalized === '') {
                            continue;
                        }

                        $fingerprint = hash('sha256', $normalized);
                        $inserted = DB::table('migration_ai_candidate_fingerprints')
                            ->insertOrIgnore([
                                'user_id' => $candidate->user_id,
                                'note_seed_id' => $candidate->note_seed_id,
                                'question_fingerprint' => $fingerprint,
                            ]);
                        if ($inserted === 0) {
                            continue;
                        }

                        DB::table('ai_card_candidates')
                            ->where('id', $candidate->id)
                            ->update(['question_fingerprint' => $fingerprint]);
                    }
                });
        } finally {
            DB::statement('DROP TABLE IF EXISTS migration_ai_candidate_fingerprints');
        }

        Schema::table('ai_card_candidates', function (Blueprint $table) {
            $table->unique(
                ['user_id', 'note_seed_id', 'question_fingerprint'],
                'idx_candidates_user_note_question_fingerprint',
            );
        });
    }

    public function down(): void
    {
        Schema::table('ai_card_candidates', function (Blueprint $table) {
            $table->dropUnique('idx_candidates_user_note_question_fingerprint');
            $table->dropColumn('question_fingerprint');
        });
    }
};
