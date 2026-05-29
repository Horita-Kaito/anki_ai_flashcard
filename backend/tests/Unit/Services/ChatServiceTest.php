<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Contracts\Services\AI\AiProviderInterface;
use App\Exceptions\Domain\AiGenerationFailedException;
use App\Exceptions\Domain\ChatSessionNotFoundException;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\User;
use App\Services\AI\FakeAiProvider;
use App\Services\ChatService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ChatServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_get_for_user_throws_when_session_is_not_owned(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $session = ChatSession::factory()->for($other)->create();

        $this->expectException(ChatSessionNotFoundException::class);

        app(ChatService::class)->getForUser($me->id, $session->id);
    }

    public function test_send_message_persists_two_messages(): void
    {
        config(['ai.default_provider' => 'fake']);
        $user = User::factory()->create();
        $session = ChatSession::factory()->for($user)->create();

        $result = app(ChatService::class)->sendMessage(
            userId: $user->id,
            chatSessionId: $session->id,
            content: '二分探索を説明して',
        );

        $this->assertSame('user', $result['user_message']->role);
        $this->assertSame('assistant', $result['assistant_message']->role);
        $this->assertSame(2, ChatMessage::query()->where('chat_session_id', $session->id)->count());
    }

    public function test_send_message_formats_json_chat_reply_as_markdown(): void
    {
        $this->app->instance(
            AiProviderInterface::class,
            FakeAiProvider::make(forceRawContent: json_encode([
                'answer' => "Gemini 1.5 Flash は高速なモデルです。\n\n主な特徴:\n\n* 高速性\n* 効率性",
                'flashcard_suggestions' => [
                    'Gemini 1.5 Flash の主な特徴は何ですか？',
                    '高速性とは何を意味しますか？',
                ],
            ], JSON_UNESCAPED_UNICODE)),
        );
        $user = User::factory()->create();
        $session = ChatSession::factory()->for($user)->create();

        $result = app(ChatService::class)->sendMessage(
            userId: $user->id,
            chatSessionId: $session->id,
            content: 'Gemini 1.5 Flash について教えて',
        );

        $content = $result['assistant_message']->content;

        $this->assertStringContainsString('Gemini 1.5 Flash は高速なモデルです。', $content);
        $this->assertStringContainsString('**カード化しやすい問い**', $content);
        $this->assertStringContainsString('- Gemini 1.5 Flash の主な特徴は何ですか？', $content);
        $this->assertStringNotContainsString('flashcard_suggestions', $content);
        $this->assertStringNotContainsString('"answer"', $content);
    }

    public function test_send_message_persists_failed_assistant_message_when_ai_fails(): void
    {
        $this->app->instance(
            AiProviderInterface::class,
            FakeAiProvider::make(throwable: AiGenerationFailedException::timeout('fake')),
        );
        $user = User::factory()->create();
        $session = ChatSession::factory()->for($user)->create();

        $result = app(ChatService::class)->sendMessage(
            userId: $user->id,
            chatSessionId: $session->id,
            content: '二分探索を説明して',
        );

        $this->assertSame('user', $result['user_message']->role);
        $this->assertSame('assistant', $result['assistant_message']->role);
        $this->assertSame('failed', $result['assistant_message']->metadata['status']);
        $this->assertSame(2, ChatMessage::query()->where('chat_session_id', $session->id)->count());
        $this->assertDatabaseHas('ai_generation_logs', [
            'user_id' => $user->id,
            'note_seed_id' => null,
            'status' => 'failed',
        ]);
    }
}
