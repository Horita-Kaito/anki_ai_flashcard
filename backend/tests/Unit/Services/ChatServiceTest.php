<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Contracts\Services\AI\AiProviderInterface;
use App\Exceptions\Domain\AiGenerationFailedException;
use App\Exceptions\Domain\ChatSessionNotFoundException;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\User;
use App\Services\AI\AiGenerationRequest;
use App\Services\AI\AiGenerationResult;
use App\Services\AI\FakeAiProvider;
use App\Services\ChatService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
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

    public function test_send_message_preserves_roles_in_bounded_json_transcript(): void
    {
        $provider = new class implements AiProviderInterface
        {
            public ?AiGenerationRequest $lastRequest = null;

            public function name(): string
            {
                return 'fake';
            }

            public function supportsJsonSchema(): bool
            {
                return false;
            }

            public function generate(AiGenerationRequest $request): AiGenerationResult
            {
                $this->lastRequest = $request;

                return new AiGenerationResult(
                    rawContent: '回答',
                    provider: 'fake',
                    model: $request->model,
                    inputTokens: 1,
                    outputTokens: 1,
                    costUsd: 0.0,
                    durationMs: 1,
                );
            }
        };
        $this->app->instance(AiProviderInterface::class, $provider);
        $user = User::factory()->create();
        $session = ChatSession::factory()->for($user)->create();
        ChatMessage::factory()->for($user)->for($session)->create([
            'role' => 'assistant',
            'content' => '前の回答',
        ]);

        app(ChatService::class)->sendMessage($user->id, $session->id, '次の質問');

        $prompt = $provider->lastRequest?->userPrompt ?? '';
        $this->assertStringContainsString('<chat_transcript data-kind="untrusted-reference">', $prompt);
        $this->assertStringContainsString('"role":"assistant","content":"前の回答"', $prompt);
        $this->assertStringContainsString('"role":"user","content":"次の質問"', $prompt);
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

    public function test_send_message_unwraps_json_string_chat_reply(): void
    {
        $this->app->instance(
            AiProviderInterface::class,
            FakeAiProvider::make(forceRawContent: json_encode(
                "EmDash についてです。\n\n- 定義: CMS の一種です。",
                JSON_UNESCAPED_UNICODE
            )),
        );
        $user = User::factory()->create();
        $session = ChatSession::factory()->for($user)->create();

        $result = app(ChatService::class)->sendMessage(
            userId: $user->id,
            chatSessionId: $session->id,
            content: 'EmDash について教えて',
        );

        $content = $result['assistant_message']->content;

        $this->assertSame("EmDash についてです。\n\n- 定義: CMS の一種です。", $content);
        $this->assertNotSame('"', $content[0]);
        $this->assertStringNotContainsString('\\n', $content);
    }

    public function test_materialize_splits_single_bulleted_note_into_multiple_notes(): void
    {
        Queue::fake();
        $this->app->instance(AiProviderInterface::class, new class implements AiProviderInterface
        {
            public function name(): string
            {
                return 'fake';
            }

            public function supportsJsonSchema(): bool
            {
                return false;
            }

            public function generate(AiGenerationRequest $request): AiGenerationResult
            {
                return new AiGenerationResult(
                    rawContent: json_encode([
                        'notes' => [[
                            'body' => "CMS の基本。\n\n- 定義: コンテンツを管理するソフトウェア。\n- 目的: 非エンジニアでも更新できるようにする。\n- 例: WordPress や Drupal。",
                            'learning_goal' => 'CMS を理解する',
                            'note_context' => 'チャットから作成',
                            'subdomain' => 'CMS',
                        ]],
                    ], JSON_UNESCAPED_UNICODE),
                    provider: 'fake',
                    model: $request->model,
                    inputTokens: 100,
                    outputTokens: 100,
                    costUsd: 0.0,
                    durationMs: 1,
                );
            }
        });
        $user = User::factory()->create();
        $session = ChatSession::factory()->for($user)->create();
        ChatMessage::factory()->for($user)->for($session)->create([
            'role' => 'user',
            'content' => 'CMS について教えて',
        ]);
        ChatMessage::factory()->for($user)->for($session)->create([
            'role' => 'assistant',
            'content' => "CMS の基本。\n\n- 定義: コンテンツを管理するソフトウェア。\n- 目的: 非エンジニアでも更新できるようにする。\n- 例: WordPress や Drupal。",
        ]);

        $result = app(ChatService::class)->materializeNotesAndGenerate($user->id, $session->id);

        $this->assertCount(3, $result['notes']);
        $this->assertStringContainsString('定義: コンテンツを管理するソフトウェア。', $result['notes'][0]->body);
        $this->assertStringContainsString('目的: 非エンジニアでも更新できるようにする。', $result['notes'][1]->body);
        $this->assertStringContainsString('例: WordPress や Drupal。', $result['notes'][2]->body);
    }

    public function test_materialize_splits_single_labeled_paragraph_note_into_multiple_notes(): void
    {
        Queue::fake();
        $this->app->instance(AiProviderInterface::class, new class implements AiProviderInterface
        {
            public function name(): string
            {
                return 'fake';
            }

            public function supportsJsonSchema(): bool
            {
                return false;
            }

            public function generate(AiGenerationRequest $request): AiGenerationResult
            {
                return new AiGenerationResult(
                    rawContent: json_encode([
                        'notes' => [[
                            'body' => "ETag の基本。\n\n**定義:** HTTP リソースの特定バージョンを識別する値。\n\n目的: キャッシュ検証で 304 Not Modified を返せるようにする。\n条件付きリクエストにも使う。\n\n例: If-None-Match と組み合わせる。",
                            'learning_goal' => 'ETag を理解する',
                            'note_context' => 'チャットから作成',
                            'subdomain' => 'HTTP',
                        ]],
                    ], JSON_UNESCAPED_UNICODE),
                    provider: 'fake',
                    model: $request->model,
                    inputTokens: 100,
                    outputTokens: 100,
                    costUsd: 0.0,
                    durationMs: 1,
                );
            }
        });
        $user = User::factory()->create();
        $session = ChatSession::factory()->for($user)->create();
        ChatMessage::factory()->for($user)->for($session)->create([
            'role' => 'user',
            'content' => 'ETag について教えて',
        ]);
        ChatMessage::factory()->for($user)->for($session)->create([
            'role' => 'assistant',
            'content' => "ETag の基本。\n\n**定義:** HTTP リソースの特定バージョンを識別する値。\n\n目的: キャッシュ検証で 304 Not Modified を返せるようにする。\n条件付きリクエストにも使う。\n\n例: If-None-Match と組み合わせる。",
        ]);

        $result = app(ChatService::class)->materializeNotesAndGenerate($user->id, $session->id);

        $this->assertCount(3, $result['notes']);
        $this->assertStringContainsString('**定義:** HTTP リソースの特定バージョンを識別する値。', $result['notes'][0]->body);
        $this->assertStringContainsString('目的: キャッシュ検証で 304 Not Modified を返せるようにする。', $result['notes'][1]->body);
        $this->assertStringContainsString('条件付きリクエストにも使う。', $result['notes'][1]->body);
        $this->assertStringContainsString('例: If-None-Match と組み合わせる。', $result['notes'][2]->body);
    }

    public function test_materialize_does_not_split_procedure_bullets_without_learning_labels(): void
    {
        Queue::fake();
        $this->app->instance(AiProviderInterface::class, new class implements AiProviderInterface
        {
            public function name(): string
            {
                return 'fake';
            }

            public function supportsJsonSchema(): bool
            {
                return false;
            }

            public function generate(AiGenerationRequest $request): AiGenerationResult
            {
                return new AiGenerationResult(
                    rawContent: json_encode([
                        'notes' => [[
                            'body' => "復習手順。\n\n- まず未処理の候補を確認する。\n- 次に採用するカードを選ぶ。\n- 最後に復習キューへ戻る。",
                            'learning_goal' => '復習手順を理解する',
                            'note_context' => 'チャットから作成',
                            'subdomain' => '復習',
                        ]],
                    ], JSON_UNESCAPED_UNICODE),
                    provider: 'fake',
                    model: $request->model,
                    inputTokens: 100,
                    outputTokens: 100,
                    costUsd: 0.0,
                    durationMs: 1,
                );
            }
        });
        $user = User::factory()->create();
        $session = ChatSession::factory()->for($user)->create();
        ChatMessage::factory()->for($user)->for($session)->create([
            'role' => 'user',
            'content' => '復習手順を教えて',
        ]);
        ChatMessage::factory()->for($user)->for($session)->create([
            'role' => 'assistant',
            'content' => "復習手順。\n\n- まず未処理の候補を確認する。\n- 次に採用するカードを選ぶ。\n- 最後に復習キューへ戻る。",
        ]);

        $result = app(ChatService::class)->materializeNotesAndGenerate($user->id, $session->id);

        $this->assertCount(1, $result['notes']);
        $this->assertStringContainsString('まず未処理の候補を確認する。', $result['notes'][0]->body);
        $this->assertStringContainsString('最後に復習キューへ戻る。', $result['notes'][0]->body);
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
