<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Card;
use App\Models\Deck;
use App\Models\DomainTemplate;
use App\Models\NoteSeed;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * FK 制約によるカスケード削除が設計通りに動くことを検証する。
 */
final class CascadeDeleteTest extends TestCase
{
    use RefreshDatabase;

    public function test_user削除で関連リソースも全削除(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $template = DomainTemplate::factory()->for($user)->create();
        $note = NoteSeed::factory()->for($user)->create();
        $tag = Tag::factory()->for($user)->create();

        $card = $this->actingAs($user)->postJson('/api/v1/cards', [
            'deck_id' => $deck->id,
            'question' => 'Q',
            'answer' => 'A',
            'card_type' => 'basic_qa',
            'tag_ids' => [$tag->id],
        ])->json('data.id');

        $user->delete();

        $this->assertDatabaseMissing('decks', ['id' => $deck->id]);
        $this->assertDatabaseMissing('domain_templates', ['id' => $template->id]);
        $this->assertDatabaseMissing('note_seeds', ['id' => $note->id]);
        $this->assertDatabaseMissing('tags', ['id' => $tag->id]);
        $this->assertDatabaseMissing('cards', ['id' => $card]);
        $this->assertDatabaseMissing('card_schedules', ['card_id' => $card]);
    }

    public function test_deck削除でcardと_scheduleと_tag関連が削除(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $tag = Tag::factory()->for($user)->create();

        $cardId = $this->actingAs($user)->postJson('/api/v1/cards', [
            'deck_id' => $deck->id,
            'question' => 'Q',
            'answer' => 'A',
            'card_type' => 'basic_qa',
            'tag_ids' => [$tag->id],
        ])->json('data.id');

        $deck->delete();

        $this->assertDatabaseMissing('cards', ['id' => $cardId]);
        $this->assertDatabaseMissing('card_schedules', ['card_id' => $cardId]);
        $this->assertDatabaseMissing('card_tag', ['card_id' => $cardId]);
        $this->assertDatabaseHas('tags', ['id' => $tag->id]); // tag 自体は残る
    }

    public function test_domain_template削除でdeckのdefault_templateはnullに(): void
    {
        $user = User::factory()->create();
        $template = DomainTemplate::factory()->for($user)->create();
        $deck = Deck::factory()->for($user)->create([
            'default_domain_template_id' => $template->id,
        ]);

        $template->delete();

        $this->assertDatabaseHas('decks', [
            'id' => $deck->id,
            'default_domain_template_id' => null,
        ]);
    }

    public function test_note_seed削除でcardのsource_note_seed_idはnullに(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $note = NoteSeed::factory()->for($user)->create();
        $card = Card::factory()->for($user)->for($deck)->create([
            'source_note_seed_id' => $note->id,
        ]);

        $note->delete();

        $this->assertDatabaseHas('cards', [
            'id' => $card->id,
            'source_note_seed_id' => null,
        ]);
    }

    public function test_tag削除でcard_tag関連も削除(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $tag = Tag::factory()->for($user)->create();
        $card = Card::factory()->for($user)->for($deck)->create();
        $card->tags()->attach($tag);

        $tag->delete();

        $this->assertDatabaseMissing('card_tag', [
            'card_id' => $card->id,
            'tag_id' => $tag->id,
        ]);
        $this->assertDatabaseHas('cards', ['id' => $card->id]); // カード自体は残る
    }
}
