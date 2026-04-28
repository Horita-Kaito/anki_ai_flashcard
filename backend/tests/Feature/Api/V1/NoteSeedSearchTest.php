<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\AiGenerationLog;
use App\Models\DomainTemplate;
use App\Models\NoteSeed;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class NoteSeedSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_qで本文を検索できる(): void
    {
        $user = User::factory()->create();
        NoteSeed::factory()->for($user)->create([
            'body' => 'DIの基本',
            'learning_goal' => null,
            'note_context' => null,
        ]);
        NoteSeed::factory()->for($user)->create([
            'body' => 'Reactの使い方',
            'learning_goal' => null,
            'note_context' => null,
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/note-seeds?q=DI')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_domain_template_idで絞り込める(): void
    {
        $user = User::factory()->create();
        $t1 = DomainTemplate::factory()->for($user)->create();
        $t2 = DomainTemplate::factory()->for($user)->create();
        NoteSeed::factory()->for($user)->create(['domain_template_id' => $t1->id]);
        NoteSeed::factory()->for($user)->create(['domain_template_id' => $t2->id]);
        NoteSeed::factory()->for($user)->create(['domain_template_id' => null]);

        $this->actingAs($user)
            ->getJson("/api/v1/note-seeds?domain_template_id={$t1->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_learning_goalも検索対象(): void
    {
        $user = User::factory()->create();
        NoteSeed::factory()->for($user)->create([
            'body' => 'メモ本文',
            'learning_goal' => 'DI を理解する',
        ]);
        NoteSeed::factory()->for($user)->create([
            'body' => '別のメモ',
            'learning_goal' => null,
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/note-seeds?q=DI')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_generation_status_no_attemptで生成試行のないメモのみ返る(): void
    {
        $user = User::factory()->create();
        $withLog = NoteSeed::factory()->for($user)->create(['body' => '生成済みメモ']);
        $withoutLog = NoteSeed::factory()->for($user)->create(['body' => '未生成メモ']);

        AiGenerationLog::create([
            'user_id' => $user->id,
            'note_seed_id' => $withLog->id,
            'provider' => 'fake',
            'model_name' => 'fake-model',
            'prompt_version' => 'v1.0',
            'input_tokens' => 0,
            'output_tokens' => 0,
            'cost_usd' => 0,
            'duration_ms' => 0,
            'status' => 'success',
            'candidates_count' => 1,
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/note-seeds?generation_status=no-attempt')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $withoutLog->id);
    }

    public function test_generation_status_の不正値は無視される(): void
    {
        $user = User::factory()->create();
        NoteSeed::factory()->for($user)->count(3)->create();

        $this->actingAs($user)
            ->getJson('/api/v1/note-seeds?generation_status=garbage')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }
}
