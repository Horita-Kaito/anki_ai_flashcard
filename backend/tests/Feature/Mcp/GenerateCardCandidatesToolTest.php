<?php

declare(strict_types=1);

namespace Tests\Feature\Mcp;

use App\Jobs\GenerateCardCandidatesJob;
use App\Mcp\Servers\TesseraServer;
use App\Mcp\Tools\GenerateCardCandidatesTool;
use App\Models\NoteSeed;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

final class GenerateCardCandidatesToolTest extends TestCase
{
    use RefreshDatabase;

    private function limiterKey(User $user): string
    {
        return md5('ai-generation'.$user->id);
    }

    public function test_生成ジョブをディスパッチしてqueuedを返す(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        $note = NoteSeed::factory()->for($user)->create();

        TesseraServer::actingAs($user)->tool(GenerateCardCandidatesTool::class, [
            'note_seed_id' => $note->id,
        ])->assertOk()->assertSee('queued');

        Queue::assertPushed(GenerateCardCandidatesJob::class);
        $this->assertDatabaseHas('ai_generation_logs', [
            'user_id' => $user->id,
            'note_seed_id' => $note->id,
            'status' => 'queued',
        ]);
    }

    public function test_成功時はai_generationのレート制限を消費する(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        $note = NoteSeed::factory()->for($user)->create();

        $this->assertSame(0, RateLimiter::attempts($this->limiterKey($user)));

        TesseraServer::actingAs($user)->tool(GenerateCardCandidatesTool::class, [
            'note_seed_id' => $note->id,
        ])->assertOk();

        $this->assertSame(1, RateLimiter::attempts($this->limiterKey($user)));
    }

    public function test_上限到達時はエラーになりジョブは発行されない(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        $note = NoteSeed::factory()->for($user)->create();

        for ($i = 0; $i < 60; $i++) {
            RateLimiter::hit($this->limiterKey($user), 3600);
        }

        TesseraServer::actingAs($user)->tool(GenerateCardCandidatesTool::class, [
            'note_seed_id' => $note->id,
        ])->assertSee('rate limit');

        Queue::assertNothingPushed();
        $this->assertDatabaseCount('ai_generation_logs', 0);
    }

    public function test_他ユーザーのメモからは生成できずレート制限も消費しない(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        $othersNote = NoteSeed::factory()->for(User::factory())->create();

        TesseraServer::actingAs($user)->tool(GenerateCardCandidatesTool::class, [
            'note_seed_id' => $othersNote->id,
        ])->assertSee('not found');

        Queue::assertNothingPushed();
        $this->assertSame(0, RateLimiter::attempts($this->limiterKey($user)));
    }
}
