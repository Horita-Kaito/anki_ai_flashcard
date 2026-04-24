<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_settings', function (Blueprint $table) {
            $table->dropColumn(['daily_new_limit', 'daily_review_limit']);
        });
    }

    public function down(): void
    {
        Schema::table('user_settings', function (Blueprint $table) {
            $table->unsignedInteger('daily_new_limit')->default(20);
            $table->unsignedInteger('daily_review_limit')->default(100);
        });
    }
};
