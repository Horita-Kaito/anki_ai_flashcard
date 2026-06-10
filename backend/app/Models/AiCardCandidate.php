<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CandidateStatus;
use App\Enums\CardType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiCardCandidate extends Model
{
    use HasFactory;

    /** @var array<int, string> */
    protected $fillable = [
        'user_id',
        'client_id',
        'note_seed_id',
        'ai_generation_log_id',
        'provider',
        'model_name',
        'question',
        'question_fingerprint',
        'answer',
        'card_type',
        'focus_type',
        'rationale',
        'explanation',
        'confidence',
        'status',
        'suggested_deck_id',
        'raw_response',
        'client_updated_at',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'card_type' => CardType::class,
        'status' => CandidateStatus::class,
        'confidence' => 'float',
        'raw_response' => 'array',
        'client_updated_at' => 'datetime',
    ];

    /** @return BelongsTo<User, self> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<NoteSeed, self> */
    public function noteSeed(): BelongsTo
    {
        return $this->belongsTo(NoteSeed::class);
    }

    /** @return BelongsTo<AiGenerationLog, self> */
    public function generationLog(): BelongsTo
    {
        return $this->belongsTo(AiGenerationLog::class, 'ai_generation_log_id');
    }
}
