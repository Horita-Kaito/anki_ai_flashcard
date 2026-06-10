<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\SyncTombstoneRepositoryInterface;
use App\Contracts\Services\SyncServiceInterface;
use App\Models\AiCardCandidate;
use App\Models\Card;
use App\Models\CardSchedule;
use App\Models\Deck;
use App\Models\NoteSeed;
use App\Models\SyncTombstone;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * 端末間オプトイン同期のコアロジック。
 *
 * - 同期キーは (user_id, client_id)。client_id は iOS の UUID。
 * - 競合解決は Last-Write-Wins（client_updated_at の比較）。削除も LWW の対象で、
 *   既存行/墓標の論理時刻より古い削除は無視する。
 * - 削除は SoftDeletes を使わず sync_tombstones で扱う（既存 Web の物理削除/カスケードを温存）。
 *   削除を受けたら物理削除 + tombstone 記録、pull で deleted=true を配信する。
 * - pull のカーソルはサーバ updated_at（壁時計, ミリ秒）。LWW とは別軸でクロックスキューを避ける。
 *
 * エンティティは push 時の依存順（親→子）で並べる。pull も同順で返す。
 *
 * 設計メモ: ENTITIES ループ内の動的 `$model::query()` は、同一ロジックで複数モデルを
 * 横断的に upsert/serialize する「同期の汎用アクセス」として意図的に Repository を経由しない。
 * 一方で sync_tombstones の操作は SyncTombstoneRepositoryInterface 経由に統一している。
 *
 * 既知の制限(v1): Web 側で行を削除しても tombstone は作られないため、その削除は iOS へ
 * 伝播しない（iOS 発の削除は明示送信されるため iOS↔iOS は完全に伝播する）。
 */
final class SyncService implements SyncServiceInterface
{
    /** 1リクエスト・1エンティティあたりの pull 上限。超過分は次回同期で取得。 */
    private const PULL_LIMIT = 500;

    /**
     * クライアント時計が未来に大きくずれている場合の許容幅(分)。
     * これを超える未来の updated_at はサーバ現在時刻にクランプし、LWW の乗っ取りを防ぐ。
     */
    private const FUTURE_SKEW_TOLERANCE_MINUTES = 5;

    /**
     * 日時として扱う属性。受信文字列は一度パースしてアプリTZへ揃えてから保存する。
     * Eloquent は Carbon の壁時計をそのまま保存するため、UTC("Z")のまま渡すと
     * 読み戻し時にアプリTZ解釈され offset 分ずれる。これを防ぐ。
     */
    private const DATE_ATTRIBUTES = ['due_at', 'last_reviewed_at', 'archived_at'];

    /**
     * @var array<string, array{
     *   model: class-string<Model>,
     *   attributes: array<int, string>,
     *   references: array<string, array{column: string, entity: string, required: bool}>,
     *   self_references?: array<string, array{column: string, payload: string}>,
     *   fingerprint?: bool,
     *   defaults?: array<string, mixed>
     * }>
     */
    private const ENTITIES = [
        'decks' => [
            'model' => Deck::class,
            'attributes' => ['name', 'description', 'display_order'],
            'references' => [],
            // 親デッキは同一エンティティの client_id を parent_id へ解決する。
            // 同一バッチ内で親が後から来るケースに備え、全件 upsert 後の second pass で解決する。
            'self_references' => [
                'parent' => ['column' => 'parent_id', 'payload' => 'parent_client_id'],
            ],
        ],
        'note_seeds' => [
            'model' => NoteSeed::class,
            'attributes' => ['body', 'learning_goal', 'subdomain', 'note_context'],
            'references' => [],
        ],
        'ai_card_candidates' => [
            'model' => AiCardCandidate::class,
            'attributes' => ['question', 'answer', 'card_type', 'focus_type', 'rationale', 'explanation', 'status'],
            'references' => [
                'note_seed' => ['column' => 'note_seed_id', 'entity' => 'note_seeds', 'required' => true],
            ],
            'fingerprint' => true,
            // provider / model_name は NOT NULL。iOS 候補は端末内生成なので既定値を入れる。
            'defaults' => ['provider' => 'ios_local', 'model_name' => 'on_device'],
        ],
        'cards' => [
            'model' => Card::class,
            'attributes' => ['question', 'answer', 'explanation', 'card_type', 'is_suspended', 'scheduler'],
            'references' => [
                'deck' => ['column' => 'deck_id', 'entity' => 'decks', 'required' => true],
                'source_note_seed' => ['column' => 'source_note_seed_id', 'entity' => 'note_seeds', 'required' => false],
                'source_ai_candidate' => ['column' => 'source_ai_candidate_id', 'entity' => 'ai_card_candidates', 'required' => false],
            ],
        ],
        'card_schedules' => [
            'model' => CardSchedule::class,
            'attributes' => ['repetitions', 'interval_days', 'ease_factor', 'stability', 'difficulty', 'due_at', 'last_reviewed_at', 'lapse_count', 'state', 'archived_at'],
            'references' => [
                'card' => ['column' => 'card_id', 'entity' => 'cards', 'required' => true],
            ],
        ],
    ];

    /** client_id -> server id の解決キャッシュ（リクエスト内）。 */
    /** @var array<string, array<string, int>> */
    private array $idCache = [];

    public function __construct(
        private readonly SyncTombstoneRepositoryInterface $tombstones,
    ) {}

    /**
     * クライアントからの変更を適用する（push）。依存順に upsert。
     *
     * @param  array<string, mixed>  $changes
     */
    public function applyChanges(int $userId, array $changes): void
    {
        DB::transaction(function () use ($userId, $changes): void {
            foreach (self::ENTITIES as $key => $config) {
                $records = $changes[$key] ?? [];
                if (! is_array($records)) {
                    continue;
                }
                foreach ($records as $record) {
                    if (is_array($record)) {
                        $this->applyRecord($userId, $key, $config, $record);
                    }
                }

                // 自己参照(親デッキ等)を全件 upsert 後に second pass で解決する。
                if (($config['self_references'] ?? []) !== []) {
                    $this->resolveSelfReferences($userId, $key, $config, $records);
                }
            }
        });
    }

    /**
     * サーバ側の差分を集める（pull）。tombstone も deleted=true として混ぜて返す。
     *
     * @return array{cursor: string, changes: array<string, array<int, array<string, mixed>>>}
     */
    public function collectChanges(int $userId, ?string $since): array
    {
        // createFromTimestampMs は UTC を返すが updated_at はアプリTZの壁時計で比較されるため揃える。
        $sinceTime = $since !== null && $since !== ''
            ? Carbon::createFromTimestampMs((int) $since)->setTimezone(config('app.timezone'))
            : null;
        $maxMs = $sinceTime?->getTimestampMs() ?? 0;
        $changes = [];

        foreach (self::ENTITIES as $key => $config) {
            /** @var class-string<Model> $model */
            $model = $config['model'];
            $query = $model::query()->where('user_id', $userId);
            if ($sinceTime !== null) {
                $query->where('updated_at', '>', $sinceTime);
            }
            $rows = $query->orderBy('updated_at')->limit(self::PULL_LIMIT)->get();

            $serialized = [];
            foreach ($rows as $row) {
                $serialized[] = $this->serialize($userId, $config, $row);
                $maxMs = max($maxMs, $row->updated_at?->getTimestampMs() ?? 0);
            }
            $changes[$key] = $serialized;
        }

        // tombstone（削除）を該当エンティティへ deleted=true として追加。
        $tombstones = $this->tombstones->pullForUser($userId, $sinceTime, self::PULL_LIMIT);

        foreach ($tombstones as $tombstone) {
            // ENTITIES に存在しない entity の墓標は配信対象外（スキーマ変更で残った孤児等）。
            if (! array_key_exists($tombstone->entity, self::ENTITIES)) {
                $maxMs = max($maxMs, $tombstone->updated_at?->getTimestampMs() ?? 0);

                continue;
            }
            if (! isset($changes[$tombstone->entity])) {
                $changes[$tombstone->entity] = [];
            }
            $changes[$tombstone->entity][] = [
                'client_id' => $tombstone->client_id,
                'deleted' => true,
                'updated_at' => $this->toIso($tombstone->client_updated_at ?? $tombstone->updated_at),
            ];
            $maxMs = max($maxMs, $tombstone->updated_at?->getTimestampMs() ?? 0);
        }

        return ['cursor' => (string) $maxMs, 'changes' => $changes];
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $record
     */
    private function applyRecord(int $userId, string $key, array $config, array $record): void
    {
        $clientId = $record['client_id'] ?? null;
        if (! is_string($clientId) || $clientId === '') {
            return;
        }

        /** @var class-string<Model> $model */
        $model = $config['model'];
        $existing = $model::query()
            ->where('user_id', $userId)
            ->where('client_id', $clientId)
            ->first();
        $tombstone = $this->tombstones->findForUser($userId, $key, $clientId);

        $incomingTime = $this->clampFuture(
            isset($record['updated_at'])
                ? Carbon::parse((string) $record['updated_at'])->setTimezone(config('app.timezone'))
                : Carbon::now()
        );
        $deleted = (bool) ($record['deleted'] ?? false);

        // Last-Write-Wins: 既存(行 or tombstone)の論理時刻より古ければ無視（削除も対象）。
        $currentTime = $this->latestLogicalTime($existing, $tombstone);
        if ($currentTime !== null && $incomingTime->lessThan($currentTime)) {
            return;
        }

        if ($deleted) {
            $this->tombstones->upsert($userId, $key, $clientId, $incomingTime);
            if ($existing !== null) {
                $existing->delete(); // 物理削除（DB の FK カスケードが発火）
            }
            unset($this->idCache[$key][$clientId]);

            return;
        }

        // 復活: より新しい更新なので削除墓標を取り消す。
        if ($tombstone !== null) {
            $this->tombstones->deleteForUser($userId, $key, $clientId);
        }

        $resolved = $this->resolveReferences($userId, $key, $config, $record, $clientId);
        if ($resolved === null) {
            return; // 必須参照が未解決
        }

        $attributes = [];
        foreach ($config['attributes'] as $column) {
            if (array_key_exists($column, $record)) {
                $value = $record[$column];
                if (in_array($column, self::DATE_ATTRIBUTES, true) && is_string($value) && $value !== '') {
                    $value = Carbon::parse($value)->setTimezone(config('app.timezone'));
                }
                $attributes[$column] = $value;
            }
        }
        $attributes = array_merge($attributes, $resolved);
        $attributes['client_updated_at'] = $incomingTime;

        if (($config['fingerprint'] ?? false) === true) {
            $question = (string) ($record['question'] ?? ($existing?->question ?? ''));
            $fingerprint = $this->fingerprint($question);
            $attributes['question_fingerprint'] = $fingerprint;

            // (user_id, note_seed_id, fingerprint) UNIQUE の衝突を事前回避。
            if ($fingerprint !== null && ! empty($resolved['note_seed_id'])) {
                $conflict = AiCardCandidate::query()
                    ->where('user_id', $userId)
                    ->where('note_seed_id', $resolved['note_seed_id'])
                    ->where('question_fingerprint', $fingerprint)
                    ->where('client_id', '!=', $clientId)
                    ->exists();
                if ($conflict) {
                    Log::warning('sync: candidate fingerprint conflict, skipped', compact('clientId'));

                    return;
                }
            }
        }

        if ($existing === null) {
            foreach (($config['defaults'] ?? []) as $column => $value) {
                if (! array_key_exists($column, $attributes)) {
                    $attributes[$column] = $value;
                }
            }
            $attributes['user_id'] = $userId;
            $attributes['client_id'] = $clientId;
            /** @var Model $instance */
            $instance = new $model;
            $instance->fill($attributes);
            $instance->save();
            $this->idCache[$key][$clientId] = (int) $instance->getKey();

            return;
        }

        $existing->fill($attributes);
        $existing->save();
        $this->idCache[$key][$clientId] = (int) $existing->getKey();
    }

    /**
     * 自己参照(親デッキ等)を解決する second pass。全件 upsert 後に呼ぶ。
     * 見つからない/自己参照/循環は null にフォールバックする。
     *
     * @param  array<string, mixed>  $config
     * @param  array<int, mixed>  $records
     */
    private function resolveSelfReferences(int $userId, string $key, array $config, array $records): void
    {
        /** @var class-string<Model> $model */
        $model = $config['model'];

        foreach ($records as $record) {
            if (! is_array($record)) {
                continue;
            }
            $clientId = $record['client_id'] ?? null;
            if (! is_string($clientId) || $clientId === '') {
                continue;
            }
            // 削除は親解決の対象外。
            if ((bool) ($record['deleted'] ?? false) === true) {
                continue;
            }

            foreach ($config['self_references'] as $reference) {
                if (! array_key_exists($reference['payload'], $record)) {
                    continue; // ペイロードに親指定が無ければ既存値を維持する。
                }

                $parentClientId = $record[$reference['payload']];
                $row = $model::query()
                    ->where('user_id', $userId)
                    ->where('client_id', $clientId)
                    ->first();
                if ($row === null) {
                    continue;
                }

                $parentId = null;
                if (is_string($parentClientId) && $parentClientId !== '' && $parentClientId !== $clientId) {
                    $parent = $model::query()
                        ->where('user_id', $userId)
                        ->where('client_id', $parentClientId)
                        ->first();
                    // 直接の循環(親の親が自分)を拒否。多段循環は v1 では考慮しない。
                    if ($parent !== null && (int) $parent->getAttribute($reference['column']) !== (int) $row->getKey()) {
                        $parentId = (int) $parent->getKey();
                    }
                }

                if ((int) $row->getAttribute($reference['column']) !== (int) $parentId) {
                    $row->setAttribute($reference['column'], $parentId);
                    $row->save();
                }
            }
        }
    }

    private function latestLogicalTime(?Model $existing, ?SyncTombstone $tombstone): ?CarbonInterface
    {
        $candidates = [];
        if ($existing !== null && $existing->client_updated_at instanceof CarbonInterface) {
            $candidates[] = $existing->client_updated_at;
        }
        if ($tombstone !== null && $tombstone->client_updated_at instanceof CarbonInterface) {
            $candidates[] = $tombstone->client_updated_at;
        }
        if ($candidates === []) {
            return null;
        }

        return collect($candidates)->sortDesc()->first();
    }

    /**
     * クライアント時計が未来に大きくずれている場合、サーバ現在時刻へクランプする。
     */
    private function clampFuture(CarbonInterface $time): CarbonInterface
    {
        $now = Carbon::now();
        $ceiling = $now->copy()->addMinutes(self::FUTURE_SKEW_TOLERANCE_MINUTES);
        if ($time->greaterThan($ceiling)) {
            return $now;
        }

        return $time;
    }

    /**
     * 参照(client_id)を bigint FK へ解決する。必須参照が解決できなければ null を返す。
     *
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $record
     * @return array<string, int|null>|null
     */
    private function resolveReferences(int $userId, string $key, array $config, array $record, string $clientId): ?array
    {
        $resolved = [];
        foreach ($config['references'] as $name => $reference) {
            $refClientId = $record[$name.'_client_id'] ?? null;
            if (! is_string($refClientId) || $refClientId === '') {
                if ($reference['required']) {
                    Log::warning('sync: required reference missing', compact('key', 'name', 'clientId'));

                    return null;
                }
                $resolved[$reference['column']] = null;

                continue;
            }

            $refId = $this->resolveId($userId, $reference['entity'], $refClientId);
            if ($refId === null && $reference['required']) {
                Log::warning('sync: required reference unresolved', compact('key', 'name', 'clientId', 'refClientId'));

                return null;
            }
            $resolved[$reference['column']] = $refId;
        }

        return $resolved;
    }

    /**
     * @param  array<string, mixed>  $config
     */
    private function serialize(int $userId, array $config, Model $row): array
    {
        $out = [
            'client_id' => $this->ensureClientId($row),
            'updated_at' => $this->toIso($row->client_updated_at ?? $row->updated_at),
            'deleted' => false,
        ];

        foreach ($config['attributes'] as $column) {
            $out[$column] = $this->scalarize($row->getAttribute($column));
        }

        foreach ($config['references'] as $name => $reference) {
            $refId = $row->getAttribute($reference['column']);
            $out[$name.'_client_id'] = $refId !== null
                ? $this->resolveClientId($userId, $reference['entity'], (int) $refId)
                : null;
        }

        // 自己参照(親)は親行の client_id へ変換して返す。
        foreach (($config['self_references'] ?? []) as $reference) {
            $parentId = $row->getAttribute($reference['column']);
            $out[$reference['payload']] = $parentId !== null
                ? $this->resolveClientIdForModel($userId, $row::class, (int) $parentId)
                : null;
        }

        return $out;
    }

    /**
     * client_id -> server id を解決（キャッシュ付き）。Web 作成行は client_id を遅延付与。
     */
    private function resolveId(int $userId, string $entity, string $clientId): ?int
    {
        if (isset($this->idCache[$entity][$clientId])) {
            return $this->idCache[$entity][$clientId];
        }

        /** @var class-string<Model> $model */
        $model = self::ENTITIES[$entity]['model'];
        $found = $model::query()
            ->where('user_id', $userId)
            ->where('client_id', $clientId)
            ->first();

        if ($found === null) {
            return null;
        }

        $id = (int) $found->getKey();
        $this->idCache[$entity][$clientId] = $id;

        return $id;
    }

    private function resolveClientId(int $userId, string $entity, int $id): ?string
    {
        /** @var class-string<Model> $model */
        $model = self::ENTITIES[$entity]['model'];

        return $this->resolveClientIdForModel($userId, $model, $id);
    }

    /**
     * @param  class-string<Model>  $model
     */
    private function resolveClientIdForModel(int $userId, string $model, int $id): ?string
    {
        $found = $model::query()->where('user_id', $userId)->whereKey($id)->first();
        if ($found === null) {
            return null;
        }

        return $this->ensureClientId($found);
    }

    /**
     * Web 作成などで client_id が無い行に UUID を付与する（updated_at は変えない）。
     */
    private function ensureClientId(Model $row): string
    {
        $clientId = $row->getAttribute('client_id');
        if (is_string($clientId) && $clientId !== '') {
            return $clientId;
        }

        $clientId = (string) Str::uuid();
        DB::table($row->getTable())
            ->where('id', $row->getKey())
            ->update(['client_id' => $clientId]);
        $row->setAttribute('client_id', $clientId);

        return $clientId;
    }

    private function fingerprint(string $question): ?string
    {
        $normalized = mb_strtolower((string) preg_replace('/[\s[:punct:]]+/u', '', trim($question)));
        if ($normalized === '') {
            return null;
        }

        return hash('sha256', $normalized);
    }

    private function scalarize(mixed $value): mixed
    {
        if ($value instanceof \BackedEnum) {
            return $value->value;
        }
        if ($value instanceof CarbonInterface) {
            return $value->toIso8601String();
        }

        return $value;
    }

    private function toIso(mixed $value): ?string
    {
        if ($value instanceof CarbonInterface) {
            return $value->toIso8601String();
        }

        return null;
    }
}
