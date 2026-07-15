<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Contracts\Repositories\CardScheduleRepositoryInterface;
use App\Models\Card;
use App\Models\Deck;
use App\Models\DomainTemplate;
use App\Models\NoteSeed;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class NoteSeedControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_未認証では401(): void
    {
        $this->getJson('/api/v1/note-seeds')->assertUnauthorized();
    }

    public function test_一覧は自分のメモのみ返す(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        NoteSeed::factory()->count(2)->for($me)->create();
        NoteSeed::factory()->count(3)->for($other)->create();

        $this->actingAs($me)
            ->getJson('/api/v1/note-seeds')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_メモを作成できる(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/v1/note-seeds', [
            'body' => 'DIは依存を外から渡すことで差し替えやすくなる',
            'learning_goal' => 'DIの基本を理解する',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.body', 'DIは依存を外から渡すことで差し替えやすくなる');

        $this->assertDatabaseHas('note_seeds', ['user_id' => $user->id]);
    }

    public function test_body空白のみで422(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)
            ->postJson('/api/v1/note-seeds', ['body' => '   '])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['body']);
    }

    public function test_body未指定で422(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)
            ->postJson('/api/v1/note-seeds', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['body']);
    }

    public function test_他ユーザーのテンプレート_i_dで422(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $template = DomainTemplate::factory()->for($other)->create();

        $this->actingAs($me)
            ->postJson('/api/v1/note-seeds', [
                'body' => 'ok',
                'domain_template_id' => $template->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['domain_template_id']);
    }

    public function test_他ユーザーのメモ詳細は404(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $note = NoteSeed::factory()->for($other)->create();

        $this->actingAs($me)
            ->getJson("/api/v1/note-seeds/{$note->id}")
            ->assertNotFound();
    }

    public function test_自分のメモを更新できる(): void
    {
        $user = User::factory()->create();
        $note = NoteSeed::factory()->for($user)->create(['body' => 'before']);

        $response = $this->actingAs($user)
            ->putJson("/api/v1/note-seeds/{$note->id}", ['body' => 'after']);

        $response->assertOk()->assertJsonPath('data.body', 'after');
    }

    public function test_他ユーザーのメモは更新できない(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $note = NoteSeed::factory()->for($other)->create();

        $this->actingAs($me)
            ->putJson("/api/v1/note-seeds/{$note->id}", ['body' => 'hack'])
            ->assertNotFound();
    }

    public function test_自分のメモを削除できる(): void
    {
        $user = User::factory()->create();
        $note = NoteSeed::factory()->for($user)->create();

        $this->actingAs($user)
            ->deleteJson("/api/v1/note-seeds/{$note->id}")
            ->assertOk()
            ->assertJsonPath('data.deleted_cards_count', 0);

        $this->assertDatabaseMissing('note_seeds', ['id' => $note->id]);
    }

    public function test_メモ削除時_既定では採用済みカードは残りsource_note_seed_idがnullになる(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $note = NoteSeed::factory()->for($user)->create();
        $card = Card::factory()->for($user)->for($deck)->create([
            'source_note_seed_id' => $note->id,
        ]);

        $this->actingAs($user)
            ->deleteJson("/api/v1/note-seeds/{$note->id}")
            ->assertOk()
            ->assertJsonPath('data.deleted_cards_count', 0);

        $this->assertDatabaseMissing('note_seeds', ['id' => $note->id]);
        $this->assertDatabaseHas('cards', [
            'id' => $card->id,
            'source_note_seed_id' => null,
        ]);
    }

    public function test_delete_cardsを指定するとメモ由来のカードと学習履歴も削除される(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $note = NoteSeed::factory()->for($user)->create();

        $ownCard = Card::factory()->for($user)->for($deck)->create([
            'source_note_seed_id' => $note->id,
        ]);
        $ownSchedule = $this->scheduleRepository()->createInitial($ownCard);

        // 別メモ由来のカードは巻き込まれない
        $otherNote = NoteSeed::factory()->for($user)->create();
        $otherCard = Card::factory()->for($user)->for($deck)->create([
            'source_note_seed_id' => $otherNote->id,
        ]);

        $this->actingAs($user)
            ->deleteJson("/api/v1/note-seeds/{$note->id}", ['delete_cards' => true])
            ->assertOk()
            ->assertJsonPath('data.deleted_cards_count', 1);

        $this->assertDatabaseMissing('note_seeds', ['id' => $note->id]);
        $this->assertDatabaseMissing('cards', ['id' => $ownCard->id]);
        $this->assertDatabaseMissing('card_schedules', ['id' => $ownSchedule->id]);
        $this->assertDatabaseHas('cards', ['id' => $otherCard->id]);
    }

    public function test_delete_cardsは他ユーザーのカードには影響しない(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $myNote = NoteSeed::factory()->for($me)->create();

        // 他ユーザーが同じ note id 値を source に持つことは通常ないが、
        // user スコープが効いていることを保証する
        $otherDeck = Deck::factory()->for($other)->create();
        $otherCard = Card::factory()->for($other)->for($otherDeck)->create([
            'source_note_seed_id' => $myNote->id,
        ]);

        $this->actingAs($me)
            ->deleteJson("/api/v1/note-seeds/{$myNote->id}", ['delete_cards' => true])
            ->assertOk()
            ->assertJsonPath('data.deleted_cards_count', 0);

        $this->assertDatabaseHas('cards', ['id' => $otherCard->id]);
    }

    public function test_メモ詳細はcards_countを含む(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $note = NoteSeed::factory()->for($user)->create();
        Card::factory()->count(2)->for($user)->for($deck)->create([
            'source_note_seed_id' => $note->id,
        ]);

        $this->actingAs($user)
            ->getJson("/api/v1/note-seeds/{$note->id}")
            ->assertOk()
            ->assertJsonPath('data.cards_count', 2);
    }

    private function scheduleRepository(): CardScheduleRepositoryInterface
    {
        return app(CardScheduleRepositoryInterface::class);
    }
}
