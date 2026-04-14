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
            $table->foreign('default_domain_template_id')
                ->references('id')
                ->on('domain_templates')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('decks', function (Blueprint $table) {
            $table->dropForeign(['default_domain_template_id']);
        });
    }
};
