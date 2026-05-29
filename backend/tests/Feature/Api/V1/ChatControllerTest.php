<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Jobs\GenerateCardCandidatesJob;
use App\Models\AiGenerationLog;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\Deck;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class ChatControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_未認証では401(): void
    {
        $this->getJson('/api/v1/chats')->assertUnauthorized();
    }

    public function test_一覧は自分のチャットのみ返す(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        ChatSession::factory()->count(2)->for($me)->create();
        ChatSession::factory()->count(3)->for($other)->create();

        $this->actingAs($me)
            ->getJson('/api/v1/chats')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_チャットを作成できる(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/v1/chats', ['title' => 'HTTP キャッシュ'])
            ->assertCreated()
            ->assertJsonPath('data.title', 'HTTP キャッシュ');

        $this->assertDatabaseHas('chat_sessions', [
            'user_id' => $user->id,
            'title' => 'HTTP キャッシュ',
        ]);
    }

    public function test_他ユーザーのチャット詳細は404(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $session = ChatSession::factory()->for($other)->create();

        $this->actingAs($me)
            ->getJson("/api/v1/chats/{$session->id}")
            ->assertNotFound();
    }

    public function test_メッセージ送信でユーザー発言とai応答を保存する(): void
    {
        config(['ai.default_provider' => 'fake']);
        $user = User::factory()->create();
        $session = ChatSession::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson("/api/v1/chats/{$session->id}/messages", [
                'content' => 'キャッシュの ETag について教えて',
            ])
            ->assertCreated()
            ->assertJsonPath('data.user_message.role', 'user')
            ->assertJsonPath('data.assistant_message.role', 'assistant');

        $this->assertDatabaseHas('chat_messages', [
            'user_id' => $user->id,
            'chat_session_id' => $session->id,
            'role' => 'user',
            'content' => 'キャッシュの ETag について教えて',
        ]);
        $this->assertDatabaseHas('chat_messages', [
            'user_id' => $user->id,
            'chat_session_id' => $session->id,
            'role' => 'assistant',
        ]);
    }

    public function test_チャットからメモを作成して候補生成を開始する(): void
    {
        Queue::fake();
        config(['ai.default_provider' => 'fake']);
        $user = User::factory()->create();
        $session = ChatSession::factory()->for($user)->create();
        ChatMessage::factory()->for($user)->for($session)->create([
            'role' => 'user',
            'content' => 'ETag の意味を知りたい',
        ]);
        ChatMessage::factory()->for($user)->for($session)->create([
            'role' => 'assistant',
            'content' => 'ETag はリソース表現の識別子で、条件付きリクエストに使う。',
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/v1/chats/{$session->id}/materialize-notes", []);

        $response->assertAccepted()
            ->assertJsonCount(1, 'data.notes')
            ->assertJsonPath('data.dispatched.0.status', 'queued')
            ->assertJsonPath('data.chat_session_deleted', true);

        $this->assertDatabaseHas('note_seeds', [
            'user_id' => $user->id,
            'note_context' => 'チャットから作成',
        ]);
        $this->assertDatabaseHas('ai_generation_logs', [
            'user_id' => $user->id,
            'status' => 'queued',
        ]);
        $this->assertDatabaseMissing('chat_sessions', ['id' => $session->id]);
        $this->assertDatabaseMissing('chat_messages', ['chat_session_id' => $session->id]);
    }

    public function test_チャットのai利用も月次トークン上限で429(): void
    {
        SystemSetting::query()->updateOrCreate(
            ['id' => SystemSetting::SINGLETON_ID],
            ['monthly_token_limit' => 1000],
        );

        config(['ai.default_provider' => 'fake']);
        $user = User::factory()->create();
        $session = ChatSession::factory()->for($user)->create();
        AiGenerationLog::query()->create([
            'user_id' => $user->id,
            'note_seed_id' => null,
            'provider' => 'fake',
            'model_name' => 'gpt-4o-mini',
            'prompt_version' => 'chat-reply:v1',
            'status' => 'success',
            'input_tokens' => 800,
            'output_tokens' => 300,
            'candidates_count' => 0,
        ]);

        $this->actingAs($user)
            ->postJson("/api/v1/chats/{$session->id}/messages", [
                'content' => 'キャッシュの ETag について教えて',
            ])
            ->assertStatus(429);

        $this->assertDatabaseMissing('chat_messages', [
            'chat_session_id' => $session->id,
            'content' => 'キャッシュの ETag について教えて',
        ]);
    }

    public function test_メモ化時のdeck_idは候補生成ジョブへ渡される(): void
    {
        Queue::fake();
        config(['ai.default_provider' => 'fake']);
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $session = ChatSession::factory()->for($user)->create();
        ChatMessage::factory()->for($user)->for($session)->create([
            'role' => 'user',
            'content' => 'ETag の意味を知りたい',
        ]);
        ChatMessage::factory()->for($user)->for($session)->create([
            'role' => 'assistant',
            'content' => 'ETag はリソース表現の識別子で、条件付きリクエストに使う。',
        ]);

        $this->actingAs($user)
            ->postJson("/api/v1/chats/{$session->id}/materialize-notes", [
                'deck_id' => $deck->id,
            ])
            ->assertAccepted();

        Queue::assertPushed(
            GenerateCardCandidatesJob::class,
            fn (GenerateCardCandidatesJob $job) => ($job->options['default_deck_id'] ?? null) === $deck->id,
        );
    }

    public function test_他ユーザーのチャットへメッセージ送信できない(): void
    {
        config(['ai.default_provider' => 'fake']);
        $me = User::factory()->create();
        $other = User::factory()->create();
        $session = ChatSession::factory()->for($other)->create();

        $this->actingAs($me)
            ->postJson("/api/v1/chats/{$session->id}/messages", [
                'content' => 'hack',
            ])
            ->assertNotFound();
    }
}
