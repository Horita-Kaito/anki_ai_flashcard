<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('decks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();

            // FK 制約は domain_templates テーブル作成時に別マイグレーションで付与する
            $table->unsignedBigInteger('default_domain_template_id')->nullable();

            $table->unsignedInteger('new_cards_limit')->default(20);
            $table->unsignedInteger('review_limit')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'updated_at'], 'idx_decks_user_updated');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('decks');
    }
};
