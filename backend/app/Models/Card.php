<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CardType;
use Database\Factories\CardFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Card extends Model
{
    /** @use HasFactory<CardFactory> */
    use HasFactory;

    /** @var array<int, string> */
    protected $fillable = [
        'user_id',
        'deck_id',
        'domain_template_id',
        'source_note_seed_id',
        'source_ai_candidate_id',
        'question',
        'answer',
        'explanation',
        'card_type',
        'is_suspended',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'card_type' => CardType::class,
        'is_suspended' => 'boolean',
    ];

    /** @return BelongsTo<User, self> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Deck, self> */
    public function deck(): BelongsTo
    {
        return $this->belongsTo(Deck::class);
    }

    /** @return HasOne<CardSchedule, self> */
    public function schedule(): HasOne
    {
        return $this->hasOne(CardSchedule::class);
    }

    /** @return BelongsToMany<Tag, self> */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'card_tag');
    }
}
