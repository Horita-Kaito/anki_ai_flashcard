<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('domain_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->json('instruction_json');
            $table->timestamps();

            $table->index(['user_id', 'updated_at'], 'idx_templates_user_updated');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('domain_templates');
    }
};
