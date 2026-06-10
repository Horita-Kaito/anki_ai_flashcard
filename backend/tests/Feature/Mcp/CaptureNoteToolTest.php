<?php

declare(strict_types=1);

namespace Tests\Feature\Mcp;

use App\Mcp\Servers\TesseraServer;
use App\Mcp\Tools\CaptureNoteTool;
use App\Models\DomainTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CaptureNoteToolTest extends TestCase
{
    use RefreshDatabase;

    public function test_会話内容をメモとして保存できる(): void
    {
        $user = User::factory()->create();

        $response = TesseraServer::actingAs($user)->tool(CaptureNoteTool::class, [
            'content' => 'DIコンテナは依存解決を一元化する仕組み',
            'learning_goal' => 'Laravelの設計原則を理解する',
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('note_seeds', [
            'user_id' => $user->id,
            'body' => 'DIコンテナは依存解決を一元化する仕組み',
            'learning_goal' => 'Laravelの設計原則を理解する',
        ]);
    }

    public function test_本文が空ならバリデーションエラー(): void
    {
        $user = User::factory()->create();

        TesseraServer::actingAs($user)
            ->tool(CaptureNoteTool::class, ['content' => ''])
            ->assertHasErrors();

        $this->assertDatabaseCount('note_seeds', 0);
    }

    public function test_他ユーザーのテンプレートは指定できない(): void
    {
        $user = User::factory()->create();
        $otherTemplate = DomainTemplate::factory()->for(User::factory())->create();

        TesseraServer::actingAs($user)->tool(CaptureNoteTool::class, [
            'content' => 'テンプレート分離の確認',
            'domain_template_id' => $otherTemplate->id,
        ])->assertHasErrors();

        $this->assertDatabaseCount('note_seeds', 0);
    }
}
