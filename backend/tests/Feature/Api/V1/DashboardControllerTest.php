<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\AiCardCandidate;
use App\Models\NoteSeed;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class DashboardControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_summary_returns_total_pending_candidates_scoped_to_user(): void
    {
        $user = User::factory()->create();
        $note = NoteSeed::factory()->for($user)->create();
        AiCardCandidate::factory()->count(3)->for($user)->for($note)->create(['status' => 'pending']);
        AiCardCandidate::factory()->for($user)->for($note)->create(['status' => 'rejected']);

        // 別ユーザーの pending はカウントされない。
        $other = User::factory()->create();
        $otherNote = NoteSeed::factory()->for($other)->create();
        AiCardCandidate::factory()->count(2)->for($other)->for($otherNote)->create(['status' => 'pending']);

        $this->actingAs($user)
            ->getJson('/api/v1/dashboard/summary')
            ->assertOk()
            ->assertJsonPath('data.total_pending_candidates', 3);
    }

    public function test_summary_requires_authentication(): void
    {
        $this->getJson('/api/v1/dashboard/summary')->assertUnauthorized();
    }
}
