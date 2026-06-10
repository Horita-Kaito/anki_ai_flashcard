<?php

declare(strict_types=1);

namespace App\Http\Requests\Sync;

use App\Enums\CandidateStatus;
use App\Enums\CardType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class SyncRequest extends FormRequest
{
    /** 1リクエスト・1エンティティあたりの push 上限。pull 側 (SyncService::PULL_LIMIT) と揃える。 */
    private const MAX_RECORDS_PER_ENTITY = 500;

    /**
     * 受信 updated_at として許可する ISO 8601 UTC 形式。
     * iOS は秒精度("...Z")または fractional seconds 付き("...sssZ" / "...sss+00:00")を送る。
     * いずれもタイムゾーンは UTC(Z または +00:00) のみ許可し、ローカルオフセットは拒否する。
     */
    private const ISO_8601_UTC = [
        'date_format:Y-m-d\TH:i:s\Z',
        'date_format:Y-m-d\TH:i:sP',
        'date_format:Y-m-d\TH:i:s.v\Z',
        'date_format:Y-m-d\TH:i:s.vP',
        'date_format:Y-m-d\TH:i:s.u\Z',
        'date_format:Y-m-d\TH:i:s.uP',
    ];

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $rules = [
            // since は SyncService が発行するカーソル: epoch ミリ秒の十進文字列のみ。
            'since' => ['nullable', 'string', 'regex:/^\d{1,19}$/'],
            'changes' => ['nullable', 'array'],
        ];

        foreach ($this->entityRules() as $entity => $attributeRules) {
            $rules["changes.{$entity}"] = ['sometimes', 'array', 'max:'.self::MAX_RECORDS_PER_ENTITY];
            $rules["changes.{$entity}.*.client_id"] = ['required', 'string', 'max:36'];
            $rules["changes.{$entity}.*.updated_at"] = ['nullable', 'string', ...$this->updatedAtRule()];
            $rules["changes.{$entity}.*.deleted"] = ['nullable', 'boolean'];

            foreach ($attributeRules as $attribute => $attributeRule) {
                $rules["changes.{$entity}.*.{$attribute}"] = $attributeRule;
            }
        }

        return $rules;
    }

    /**
     * updated_at は複数の許容フォーマットのいずれかに一致すればよい。
     *
     * @return array<int, string>
     */
    private function updatedAtRule(): array
    {
        // date_format は OR を直接表現できないため、各フォーマットを別ルールにすると
        // AND 評価になり全滅する。Rule::anyOf 相当を正規表現の単一ルールで担保する。
        return [
            'regex:/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|\+00:00)$/',
        ];
    }

    /**
     * 各エンティティのドメイン属性に対する型・長さ・enum 検証。
     * 既存の各リソース FormRequest のルールに合わせる。参照(*_client_id)は string で受ける。
     *
     * @return array<string, array<string, array<int, mixed>>>
     */
    private function entityRules(): array
    {
        return [
            'decks' => [
                'name' => ['sometimes', 'nullable', 'string', 'max:255'],
                'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
                'display_order' => ['sometimes', 'nullable', 'integer'],
                'parent_client_id' => ['sometimes', 'nullable', 'string', 'max:36'],
            ],
            'note_seeds' => [
                'body' => ['sometimes', 'nullable', 'string', 'max:5000'],
                'learning_goal' => ['sometimes', 'nullable', 'string', 'max:1000'],
                'subdomain' => ['sometimes', 'nullable', 'string', 'max:255'],
                'note_context' => ['sometimes', 'nullable', 'string', 'max:2000'],
            ],
            'ai_card_candidates' => [
                'question' => ['sometimes', 'nullable', 'string', 'max:2000'],
                'answer' => ['sometimes', 'nullable', 'string', 'max:2000'],
                'card_type' => ['sometimes', 'nullable', Rule::in(CardType::values())],
                'focus_type' => ['sometimes', 'nullable', 'string', 'max:255'],
                'rationale' => ['sometimes', 'nullable', 'string', 'max:5000'],
                'explanation' => ['sometimes', 'nullable', 'string', 'max:5000'],
                'status' => ['sometimes', 'nullable', Rule::in(array_map(
                    static fn (CandidateStatus $s): string => $s->value,
                    CandidateStatus::cases(),
                ))],
                'note_seed_client_id' => ['sometimes', 'nullable', 'string', 'max:36'],
            ],
            'cards' => [
                'question' => ['sometimes', 'nullable', 'string', 'max:2000'],
                'answer' => ['sometimes', 'nullable', 'string', 'max:2000'],
                'explanation' => ['sometimes', 'nullable', 'string', 'max:5000'],
                'card_type' => ['sometimes', 'nullable', Rule::in(CardType::values())],
                'is_suspended' => ['sometimes', 'nullable', 'boolean'],
                'scheduler' => ['sometimes', 'nullable', 'string', 'max:32'],
                'deck_client_id' => ['sometimes', 'nullable', 'string', 'max:36'],
                'source_note_seed_client_id' => ['sometimes', 'nullable', 'string', 'max:36'],
                'source_ai_candidate_client_id' => ['sometimes', 'nullable', 'string', 'max:36'],
            ],
            'card_schedules' => [
                'repetitions' => ['sometimes', 'nullable', 'integer'],
                'interval_days' => ['sometimes', 'nullable', 'numeric'],
                'ease_factor' => ['sometimes', 'nullable', 'numeric'],
                'stability' => ['sometimes', 'nullable', 'numeric'],
                'difficulty' => ['sometimes', 'nullable', 'numeric'],
                'due_at' => ['sometimes', 'nullable', 'string', 'max:64'],
                'last_reviewed_at' => ['sometimes', 'nullable', 'string', 'max:64'],
                'lapse_count' => ['sometimes', 'nullable', 'integer'],
                'state' => ['sometimes', 'nullable', 'string', 'max:32'],
                'archived_at' => ['sometimes', 'nullable', 'string', 'max:64'],
                'card_client_id' => ['sometimes', 'nullable', 'string', 'max:36'],
            ],
        ];
    }
}
