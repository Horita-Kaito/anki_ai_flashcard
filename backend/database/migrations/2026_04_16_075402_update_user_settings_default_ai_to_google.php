<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_settings', function (Blueprint $table) {
            $table->string('default_ai_provider', 50)->default('google')->change();
            $table->string('default_ai_model', 100)->default('gemini-2.5-flash')->change();
        });

        DB::table('user_settings')
            ->where('default_ai_provider', 'openai')
            ->where('default_ai_model', 'gpt-4o-mini')
            ->update([
                'default_ai_provider' => 'google',
                'default_ai_model' => 'gemini-2.5-flash',
            ]);
    }

    public function down(): void
    {
        Schema::table('user_settings', function (Blueprint $table) {
            $table->string('default_ai_provider', 50)->default('openai')->change();
            $table->string('default_ai_model', 100)->default('gpt-4o-mini')->change();
        });
    }
};
