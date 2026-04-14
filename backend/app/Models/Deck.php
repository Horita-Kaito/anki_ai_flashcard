<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\DeckFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Deck extends Model
{
    /** @use HasFactory<DeckFactory> */
    use HasFactory;

    /** @var array<int, string> */
    protected $fillable = [
        'user_id',
        'name',
        'description',
        'default_domain_template_id',
        'new_cards_limit',
        'review_limit',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'new_cards_limit' => 'integer',
        'review_limit' => 'integer',
        'default_domain_template_id' => 'integer',
    ];

    /** @return BelongsTo<User, self> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
