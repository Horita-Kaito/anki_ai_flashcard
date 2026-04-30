<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\AiCardCandidate;
use App\Models\Card;
use App\Models\CardSchedule;
use App\Models\Deck;
use App\Models\NoteSeed;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CardControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_未認証では401(): void
    {
        $this->getJson('/api/v1/cards')->assertUnauthorized();
    }

    public function test_自分のカードのみ一覧に含まれる(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $myDeck = Deck::factory()->for($me)->create();
        $otherDeck = Deck::factory()->for($other)->create();
        Card::factory()->count(2)->for($me)->for($myDeck)->create();
        Card::factory()->count(3)->for($other)->for($otherDeck)->create();

        $this->actingAs($me)
            ->getJson('/api/v1/cards')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_deck_idで絞り込める(): void
    {
        $user = User::factory()->create();
        $deckA = Deck::factory()->for($user)->create();
        $deckB = Deck::factory()->for($user)->create();
        Card::factory()->count(2)->for($user)->for($deckA)->create();
        Card::factory()->count(3)->for($user)->for($deckB)->create();

        $this->actingAs($user)
            ->getJson("/api/v1/cards?deck_id={$deckA->id}")
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_カード作成時にスケジュールが自動生成される(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();

        $response = $this->actingAs($user)->postJson('/api/v1/cards', [
            'deck_id' => $deck->id,
            'question' => 'DIとは?',
            'answer' => '依存性注入',
            'card_type' => 'basic_qa',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.question', 'DIとは?')
            ->assertJsonPath('data.schedule.state', 'new')
            ->assertJsonPath('data.schedule.repetitions', 0);

        $card = Card::first();
        $this->assertNotNull($card);
        $this->assertDatabaseHas('card_schedules', [
            'card_id' => $card->id,
            'state' => 'new',
        ]);
    }

    public function test_タグ付きでカードを作成できる(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $tag = Tag::factory()->for($user)->create();

        $response = $this->actingAs($user)->postJson('/api/v1/cards', [
            'deck_id' => $deck->id,
            'question' => 'Q',
            'answer' => 'A',
            'card_type' => 'basic_qa',
            'tag_ids' => [$tag->id],
        ]);

        $response->assertCreated()
            ->assertJsonCount(1, 'data.tags');

        $this->assertDatabaseHas('card_tag', [
            'card_id' => Card::first()->id,
            'tag_id' => $tag->id,
        ]);
    }

    public function test_他ユーザーのデッキでは作成できない(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $otherDeck = Deck::factory()->for($other)->create();

        $this->actingAs($me)
            ->postJson('/api/v1/cards', [
                'deck_id' => $otherDeck->id,
                'question' => 'Q',
                'answer' => 'A',
                'card_type' => 'basic_qa',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['deck_id']);
    }

    public function test_他ユーザーのタグでは作成できない(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $deck = Deck::factory()->for($me)->create();
        $otherTag = Tag::factory()->for($other)->create();

        $this->actingAs($me)
            ->postJson('/api/v1/cards', [
                'deck_id' => $deck->id,
                'question' => 'Q',
                'answer' => 'A',
                'card_type' => 'basic_qa',
                'tag_ids' => [$otherTag->id],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['tag_ids.0']);
    }

    public function test_不正なcard_typeで422(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson('/api/v1/cards', [
                'deck_id' => $deck->id,
                'question' => 'Q',
                'answer' => 'A',
                'card_type' => 'invalid',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['card_type']);
    }

    public function test_他ユーザーのカードは詳細取得できない(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $otherDeck = Deck::factory()->for($other)->create();
        $card = Card::factory()->for($other)->for($otherDeck)->create();

        $this->actingAs($me)
            ->getJson("/api/v1/cards/{$card->id}")
            ->assertNotFound();
    }

    public function test_自分のカードを更新できる(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $card = Card::factory()->for($user)->for($deck)->create(['question' => 'before']);

        $this->actingAs($user)
            ->putJson("/api/v1/cards/{$card->id}", ['question' => 'after'])
            ->assertOk()
            ->assertJsonPath('data.question', 'after');
    }

    public function test_scheduler_を変更すると学習進捗がリセットされる(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();

        // sm2 のカードを作って、いくらか進捗があるようにスケジュールをセットアップ
        $response = $this->actingAs($user)->postJson('/api/v1/cards', [
            'deck_id' => $deck->id,
            'question' => 'Q',
            'answer' => 'A',
            'card_type' => 'basic_qa',
            'scheduler' => 'sm2',
        ]);
        $cardId = $response->json('data.id');

        // 進捗があるかのように schedule を直接書き換え (review state、interval=14、ease=2.3)
        CardSchedule::where('card_id', $cardId)->update([
            'state' => 'review',
            'repetitions' => 5,
            'interval_days' => 14,
            'ease_factor' => 2.30,
            'lapse_count' => 1,
        ]);

        // scheduler を fsrs に切替
        $this->actingAs($user)
            ->putJson("/api/v1/cards/{$cardId}", ['scheduler' => 'fsrs'])
            ->assertOk()
            ->assertJsonPath('data.scheduler', 'fsrs')
            ->assertJsonPath('data.schedule.state', 'new')
            ->assertJsonPath('data.schedule.repetitions', 0)
            ->assertJsonPath('data.schedule.interval_days', 0)
            ->assertJsonPath('data.schedule.lapse_count', 0)
            ->assertJsonPath('data.schedule.stability', null)
            ->assertJsonPath('data.schedule.difficulty', null);
    }

    public function test_scheduler_を変えない更新ではスケジュールはリセットされない(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();

        $response = $this->actingAs($user)->postJson('/api/v1/cards', [
            'deck_id' => $deck->id,
            'question' => 'Q',
            'answer' => 'A',
            'card_type' => 'basic_qa',
            'scheduler' => 'fsrs',
        ]);
        $cardId = $response->json('data.id');

        CardSchedule::where('card_id', $cardId)->update([
            'state' => 'review',
            'repetitions' => 3,
            'interval_days' => 7,
            'stability' => 7.5,
            'difficulty' => 5.5,
        ]);

        // question だけ変更
        $this->actingAs($user)
            ->putJson("/api/v1/cards/{$cardId}", ['question' => 'updated'])
            ->assertOk()
            ->assertJsonPath('data.schedule.repetitions', 3)
            ->assertJsonPath('data.schedule.interval_days', 7)
            ->assertJsonPath('data.schedule.stability', 7.5);
    }

    public function test_scheduler_を_fsrs_から_sm2_に戻すと_fsr_s_状態がクリアされる(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();

        $response = $this->actingAs($user)->postJson('/api/v1/cards', [
            'deck_id' => $deck->id,
            'question' => 'Q',
            'answer' => 'A',
            'card_type' => 'basic_qa',
            'scheduler' => 'fsrs',
        ]);
        $cardId = $response->json('data.id');

        // FSRS 状態を進めた状態を再現
        CardSchedule::where('card_id', $cardId)->update([
            'state' => 'review',
            'repetitions' => 5,
            'interval_days' => 14,
            'stability' => 14.5,
            'difficulty' => 6.0,
            'lapse_count' => 2,
        ]);

        // sm2 へ切替
        $this->actingAs($user)
            ->putJson("/api/v1/cards/{$cardId}", ['scheduler' => 'sm2'])
            ->assertOk()
            ->assertJsonPath('data.scheduler', 'sm2')
            ->assertJsonPath('data.schedule.state', 'new')
            ->assertJsonPath('data.schedule.repetitions', 0)
            ->assertJsonPath('data.schedule.interval_days', 0)
            ->assertJsonPath('data.schedule.lapse_count', 0)
            ->assertJsonPath('data.schedule.stability', null)
            ->assertJsonPath('data.schedule.difficulty', null)
            // SM-2 カードでは ease_factor が 2.5 にリセットされる
            ->assertJsonPath('data.schedule.ease_factor', 2.5);
    }

    public function test_scheduler_リセット時にアーカイブも解除される(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $card = Card::factory()->for($user)->for($deck)->create([
            'scheduler' => 'sm2',
        ]);
        // アーカイブ済みのスケジュールを用意
        CardSchedule::create([
            'user_id' => $user->id,
            'card_id' => $card->id,
            'state' => 'review',
            'repetitions' => 10,
            'interval_days' => 200,
            'ease_factor' => 2.50,
            'lapse_count' => 0,
            'archived_at' => now(),
            'due_at' => now()->addDays(200),
        ]);

        // scheduler 変更でアーカイブ解除も発生
        $response = $this->actingAs($user)
            ->putJson("/api/v1/cards/{$card->id}", ['scheduler' => 'fsrs'])
            ->assertOk();

        $this->assertDatabaseHas('card_schedules', [
            'card_id' => $card->id,
            'archived_at' => null,
            'state' => 'new',
        ]);
        $this->assertSame(false, $response->json('data.is_archived'));
    }

    public function test_不正な_scheduler_値は422で弾かれる(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $card = Card::factory()->for($user)->for($deck)->create();

        $this->actingAs($user)
            ->putJson("/api/v1/cards/{$card->id}", ['scheduler' => 'invalid_algo'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['scheduler']);
    }

    public function test_a_i候補採用時に_scheduler_を_sm2_指定できる(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $note = NoteSeed::factory()->for($user)->create();
        $candidate = AiCardCandidate::factory()->state([
            'user_id' => $user->id,
            'note_seed_id' => $note->id,
            'question' => 'Q',
            'answer' => 'A',
        ])->create();

        $response = $this->actingAs($user)
            ->postJson("/api/v1/ai-card-candidates/{$candidate->id}/adopt", [
                'deck_id' => $deck->id,
                'scheduler' => 'sm2',
            ])
            ->assertCreated()
            ->assertJsonPath('data.scheduler', 'sm2');

        $this->assertDatabaseHas('cards', [
            'id' => $response->json('data.id'),
            'scheduler' => 'sm2',
        ]);
    }

    public function test_カード削除でスケジュールも消える(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();

        $response = $this->actingAs($user)->postJson('/api/v1/cards', [
            'deck_id' => $deck->id,
            'question' => 'Q',
            'answer' => 'A',
            'card_type' => 'basic_qa',
        ]);

        $cardId = $response->json('data.id');

        $this->actingAs($user)
            ->deleteJson("/api/v1/cards/{$cardId}")
            ->assertNoContent();

        $this->assertDatabaseMissing('cards', ['id' => $cardId]);
        $this->assertDatabaseMissing('card_schedules', ['card_id' => $cardId]);
    }
}
