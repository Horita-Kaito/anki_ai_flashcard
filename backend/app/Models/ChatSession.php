<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ChatSessionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatSession extends Model
{
    /** @use HasFactory<ChatSessionFactory> */
    use HasFactory;

    /** @var array<int, string> */
    protected $fillable = [
        'user_id',
        'title',
        'domain_template_id',
        'deck_id',
    ];

    /** @return BelongsTo<User, self> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
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

    /** @return HasMany<ChatMessage, self> */
    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class);
    }
}
