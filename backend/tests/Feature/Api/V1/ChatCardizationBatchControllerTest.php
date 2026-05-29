<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\ChatCardizationBatch;
use App\Models\NoteSeed;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ChatCardizationBatchControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_未認証では401(): void
    {
        $this->getJson('/api/v1/chat-cardization-batches')->assertUnauthorized();
    }

    public function test_一覧は自分のカード化履歴のみ返す(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        ChatCardizationBatch::factory()->count(2)->for($me)->create();
        ChatCardizationBatch::factory()->count(3)->for($other)->create();

        $this->actingAs($me)
            ->getJson('/api/v1/chat-cardization-batches')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_詳細は紐づくメモを返す(): void
    {
        $user = User::factory()->create();
        $batch = ChatCardizationBatch::factory()->for($user)->create([
            'source_chat_session_title' => 'ETag の相談',
            'notes_count' => 1,
        ]);
        $note = NoteSeed::factory()->for($user)->create([
            'body' => 'ETag はリソース表現の識別子。',
        ]);
        $batch->noteSeeds()->attach($note->id, [
            'user_id' => $user->id,
            'generation_status' => 'queued',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($user)
            ->getJson("/api/v1/chat-cardization-batches/{$batch->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $batch->id)
            ->assertJsonPath('data.source_chat_session_title', 'ETag の相談')
            ->assertJsonCount(1, 'data.notes')
            ->assertJsonPath('data.notes.0.id', $note->id);
    }

    public function test_他ユーザーのカード化履歴詳細は404(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $batch = ChatCardizationBatch::factory()->for($other)->create();

        $this->actingAs($me)
            ->getJson("/api/v1/chat-cardization-batches/{$batch->id}")
            ->assertNotFound();
    }
}
