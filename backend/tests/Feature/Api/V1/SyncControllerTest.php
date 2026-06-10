<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\AiCardCandidate;
use App\Models\Card;
use App\Models\Deck;
use App\Models\NoteSeed;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

final class SyncControllerTest extends TestCase
{
    use RefreshDatabase;

    /** @param array<string, mixed> $payload */
    private function sync(User $user, array $payload): TestResponse
    {
        return $this->actingAs($user)->postJson('/api/v1/sync', $payload);
    }

    public function test_push_creates_records_and_resolves_client_id_references(): void
    {
        $user = User::factory()->create();
        $deckCid = (string) Str::uuid();
        $noteCid = (string) Str::uuid();
        $candCid = (string) Str::uuid();
        $cardCid = (string) Str::uuid();

        $this->sync($user, [
            'since' => null,
            'changes' => [
                'decks' => [
                    ['client_id' => $deckCid, 'name' => 'デッキA', 'updated_at' => '2026-06-01T00:00:00Z'],
                ],
                'note_seeds' => [
                    ['client_id' => $noteCid, 'body' => '学習メモ', 'updated_at' => '2026-06-01T00:00:00Z'],
                ],
                'ai_card_candidates' => [
                    [
                        'client_id' => $candCid,
                        'note_seed_client_id' => $noteCid,
                        'question' => '質問1',
                        'answer' => '答え1',
                        'status' => 'pending',
                        'updated_at' => '2026-06-01T00:00:00Z',
                    ],
                ],
                'cards' => [
                    [
                        'client_id' => $cardCid,
                        'deck_client_id' => $deckCid,
                        'source_note_seed_client_id' => $noteCid,
                        'question' => '質問1',
                        'answer' => '答え1',
                        'updated_at' => '2026-06-01T00:00:00Z',
                    ],
                ],
            ],
        ])->assertOk();

        $deck = Deck::where('client_id', $deckCid)->firstOrFail();
        $note = NoteSeed::where('client_id', $noteCid)->firstOrFail();
        $cand = AiCardCandidate::where('client_id', $candCid)->firstOrFail();
        $card = Card::where('client_id', $cardCid)->firstOrFail();

        $this->assertSame($user->id, $deck->user_id);
        $this->assertSame('デッキA', $deck->name);
        // 参照が bigint FK に解決されていること
        $this->assertSame($note->id, $cand->note_seed_id);
        $this->assertSame($deck->id, $card->deck_id);
        $this->assertSame($note->id, $card->source_note_seed_id);
        // 候補の fingerprint が自動計算されていること
        $this->assertNotNull($cand->question_fingerprint);
    }

    public function test_pull_returns_changes_then_empty_for_advanced_cursor(): void
    {
        $user = User::factory()->create();
        $deckCid = (string) Str::uuid();

        $first = $this->sync($user, [
            'since' => null,
            'changes' => [
                'decks' => [['client_id' => $deckCid, 'name' => 'D1', 'updated_at' => '2026-06-01T00:00:00Z']],
            ],
        ])->assertOk();

        $this->assertCount(1, $first->json('data.changes.decks'));
        $this->assertSame('D1', $first->json('data.changes.decks.0.name'));
        $cursor = $first->json('data.cursor');

        // 変更なしで cursor を進めた再同期は差分ゼロ
        $second = $this->sync($user, ['since' => $cursor, 'changes' => []])->assertOk();
        $this->assertCount(0, $second->json('data.changes.decks'));
    }

    public function test_last_write_wins_ignores_older_update(): void
    {
        $user = User::factory()->create();
        $cid = (string) Str::uuid();

        $this->sync($user, ['changes' => [
            'decks' => [['client_id' => $cid, 'name' => '新しい', 'updated_at' => '2026-06-02T00:00:00Z']],
        ]])->assertOk();

        // より古い更新は無視される
        $this->sync($user, ['changes' => [
            'decks' => [['client_id' => $cid, 'name' => '古い', 'updated_at' => '2026-06-01T00:00:00Z']],
        ]])->assertOk();
        $this->assertSame('新しい', Deck::where('client_id', $cid)->firstOrFail()->name);

        // より新しい更新は反映される
        $this->sync($user, ['changes' => [
            'decks' => [['client_id' => $cid, 'name' => '最新', 'updated_at' => '2026-06-03T00:00:00Z']],
        ]])->assertOk();
        $this->assertSame('最新', Deck::where('client_id', $cid)->firstOrFail()->name);
    }

    public function test_delete_hard_removes_row_records_tombstone_and_propagates(): void
    {
        $user = User::factory()->create();
        $cid = (string) Str::uuid();

        $this->sync($user, ['changes' => [
            'decks' => [['client_id' => $cid, 'name' => 'D', 'updated_at' => '2026-06-01T00:00:00Z']],
        ]])->assertOk();

        $this->sync($user, ['changes' => [
            'decks' => [['client_id' => $cid, 'deleted' => true, 'updated_at' => '2026-06-02T00:00:00Z']],
        ]])->assertOk();

        // 行は物理削除され、tombstone が残る（既存 Web の物理削除挙動を維持）
        $this->assertDatabaseMissing('decks', ['client_id' => $cid]);
        $this->assertDatabaseHas('sync_tombstones', [
            'user_id' => $user->id,
            'entity' => 'decks',
            'client_id' => $cid,
        ]);

        // 別デバイス相当（since=null）で tombstone が deleted=true として配信される
        $pull = $this->sync($user, ['since' => null, 'changes' => []])->assertOk();
        $decks = collect($pull->json('data.changes.decks'));
        $tombstone = $decks->firstWhere('client_id', $cid);
        $this->assertNotNull($tombstone);
        $this->assertTrue($tombstone['deleted']);
    }

    public function test_recreate_after_delete_resurrects_when_newer(): void
    {
        $user = User::factory()->create();
        $cid = (string) Str::uuid();

        $this->sync($user, ['changes' => [
            'decks' => [['client_id' => $cid, 'name' => 'D', 'updated_at' => '2026-06-01T00:00:00Z']],
        ]])->assertOk();
        $this->sync($user, ['changes' => [
            'decks' => [['client_id' => $cid, 'deleted' => true, 'updated_at' => '2026-06-02T00:00:00Z']],
        ]])->assertOk();

        // より新しい再作成は復活する（tombstone 取り消し）
        $this->sync($user, ['changes' => [
            'decks' => [['client_id' => $cid, 'name' => '復活', 'updated_at' => '2026-06-03T00:00:00Z']],
        ]])->assertOk();

        $this->assertDatabaseHas('decks', ['client_id' => $cid, 'name' => '復活']);
        $this->assertDatabaseMissing('sync_tombstones', ['client_id' => $cid]);
    }

    public function test_users_are_isolated(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $cid = (string) Str::uuid();

        $this->sync($user1, ['changes' => [
            'decks' => [['client_id' => $cid, 'name' => 'U1', 'updated_at' => '2026-06-01T00:00:00Z']],
        ]])->assertOk();

        $pull = $this->sync($user2, ['since' => null, 'changes' => []])->assertOk();
        $this->assertCount(0, $pull->json('data.changes.decks'));
    }

    public function test_web_created_row_gets_client_id_and_is_returned_on_pull(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create(['name' => 'Web作成']);
        $this->assertNull($deck->client_id);

        $pull = $this->sync($user, ['since' => null, 'changes' => []])->assertOk();

        $decks = collect($pull->json('data.changes.decks'));
        $row = $decks->firstWhere('client_id', $deck->fresh()->client_id);
        $this->assertNotNull($deck->fresh()->client_id);
        $this->assertNotNull($row);
        $this->assertSame('Web作成', $row['name']);
    }

    public function test_rejects_when_entity_exceeds_max_records(): void
    {
        $user = User::factory()->create();

        $decks = [];
        for ($i = 0; $i < 501; $i++) {
            $decks[] = ['client_id' => (string) Str::uuid(), 'name' => "D{$i}", 'updated_at' => '2026-06-01T00:00:00Z'];
        }

        $this->sync($user, ['since' => null, 'changes' => ['decks' => $decks]])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['changes.decks']);
    }

    public function test_rejects_invalid_updated_at_format(): void
    {
        $user = User::factory()->create();

        // ローカルオフセット付き(+09:00)や非 ISO8601 は拒否される。
        $this->sync($user, ['since' => null, 'changes' => [
            'decks' => [['client_id' => (string) Str::uuid(), 'name' => 'D', 'updated_at' => '2026-06-01 00:00:00']],
        ]])->assertStatus(422)->assertJsonValidationErrors(['changes.decks.0.updated_at']);

        $this->sync($user, ['since' => null, 'changes' => [
            'decks' => [['client_id' => (string) Str::uuid(), 'name' => 'D', 'updated_at' => '2026-06-01T00:00:00+09:00']],
        ]])->assertStatus(422)->assertJsonValidationErrors(['changes.decks.0.updated_at']);

        // fractional seconds 付き UTC は許可される。
        $this->sync($user, ['since' => null, 'changes' => [
            'decks' => [['client_id' => (string) Str::uuid(), 'name' => 'D', 'updated_at' => '2026-06-01T00:00:00.123Z']],
        ]])->assertOk();
    }

    public function test_future_updated_at_is_clamped_to_server_now(): void
    {
        $user = User::factory()->create();
        $cid = (string) Str::uuid();
        $future = now()->addDays(3650)->utc()->format('Y-m-d\TH:i:s\Z');

        $this->sync($user, ['changes' => [
            'decks' => [['client_id' => $cid, 'name' => '未来', 'updated_at' => $future]],
        ]])->assertOk();

        $deck = Deck::where('client_id', $cid)->firstOrFail();
        // client_updated_at は現在時刻付近にクランプされる(数十年先にはならない)。
        $this->assertTrue($deck->client_updated_at->lessThan(now()->addMinutes(10)));

        // クランプにより乗っ取りが起きず、通常の現在時刻更新が反映できる。
        $now = now()->utc()->format('Y-m-d\TH:i:s\Z');
        $this->sync($user, ['changes' => [
            'decks' => [['client_id' => $cid, 'name' => '上書き', 'updated_at' => $now]],
        ]])->assertOk();
        $this->assertSame('上書き', Deck::where('client_id', $cid)->firstOrFail()->name);
    }

    public function test_parent_client_id_push_and_pull_round_trip(): void
    {
        $user = User::factory()->create();
        $parentCid = (string) Str::uuid();
        $childCid = (string) Str::uuid();

        // 子が親より先に並んでいても second pass で親を解決できること。
        $this->sync($user, ['since' => null, 'changes' => [
            'decks' => [
                ['client_id' => $childCid, 'name' => '子', 'parent_client_id' => $parentCid, 'updated_at' => '2026-06-01T00:00:00Z'],
                ['client_id' => $parentCid, 'name' => '親', 'parent_client_id' => null, 'updated_at' => '2026-06-01T00:00:00Z'],
            ],
        ]])->assertOk();

        $parent = Deck::where('client_id', $parentCid)->firstOrFail();
        $child = Deck::where('client_id', $childCid)->firstOrFail();
        $this->assertSame($parent->id, $child->parent_id);

        // pull で parent_id が親の client_id へ変換されて返ること。
        $pull = $this->sync($user, ['since' => null, 'changes' => []])->assertOk();
        $decks = collect($pull->json('data.changes.decks'));
        $childRow = $decks->firstWhere('client_id', $childCid);
        $parentRow = $decks->firstWhere('client_id', $parentCid);
        $this->assertSame($parentCid, $childRow['parent_client_id']);
        $this->assertNull($parentRow['parent_client_id']);
    }

    public function test_self_referencing_parent_is_rejected(): void
    {
        $user = User::factory()->create();
        $cid = (string) Str::uuid();

        $this->sync($user, ['since' => null, 'changes' => [
            'decks' => [['client_id' => $cid, 'name' => '自己', 'parent_client_id' => $cid, 'updated_at' => '2026-06-01T00:00:00Z']],
        ]])->assertOk();

        $this->assertNull(Deck::where('client_id', $cid)->firstOrFail()->parent_id);
    }

    public function test_older_delete_is_ignored_when_row_is_newer(): void
    {
        $user = User::factory()->create();
        $cid = (string) Str::uuid();

        // 新しい行を作成。
        $this->sync($user, ['changes' => [
            'decks' => [['client_id' => $cid, 'name' => '生存', 'updated_at' => '2026-06-02T00:00:00Z']],
        ]])->assertOk();

        // より古い削除は無視され、行は残る。
        $this->sync($user, ['changes' => [
            'decks' => [['client_id' => $cid, 'deleted' => true, 'updated_at' => '2026-06-01T00:00:00Z']],
        ]])->assertOk();

        $this->assertDatabaseHas('decks', ['client_id' => $cid, 'name' => '生存']);
        $this->assertDatabaseMissing('sync_tombstones', ['client_id' => $cid]);
    }
}
