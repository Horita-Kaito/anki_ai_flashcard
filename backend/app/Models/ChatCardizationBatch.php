<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ChatCardizationBatchFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ChatCardizationBatch extends Model
{
    /** @use HasFactory<ChatCardizationBatchFactory> */
    use HasFactory;

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_PARTIAL_FAILED = 'partial_failed';

    /** @var array<int, string> */
    protected $fillable = [
        'user_id',
        'source_chat_session_id',
        'source_chat_session_title',
        'domain_template_id',
        'deck_id',
        'notes_count',
        'dispatched_count',
        'failed_count',
        'status',
    ];

    /** @return BelongsTo<User, self> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<ChatSession, self> */
    public function sourceChatSession(): BelongsTo
    {
        return $this->belongsTo(ChatSession::class, 'source_chat_session_id');
    }

    /** @return BelongsTo<DomainTemplate, self> */
    public function domainTemplate(): BelongsTo
    {
        return $this->belongsTo(DomainTemplate::class);
    }

    /** @return BelongsTo<Deck, self> */
    public function deck(): BelongsTo
    {
        return $this->belongsTo(Deck::class);
    }

    /** @return BelongsToMany<NoteSeed> */
    public function noteSeeds(): BelongsToMany
    {
        return $this->belongsToMany(
            NoteSeed::class,
            'chat_cardization_batch_note_seed',
        )
            ->withPivot([
                'user_id',
                'ai_generation_log_id',
                'generation_status',
                'failure_reason',
            ])
            ->withTimestamps()
            ->orderBy('chat_cardization_batch_note_seed.id');
    }
}
