<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ReviewRating;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CardReview extends Model
{
    use HasFactory;

    /** @var array<int, string> */
    protected $fillable = [
        'user_id',
        'card_id',
        'reviewed_at',
        'rating',
        'scheduled_due_at',
        'actual_interval_days',
        'response_time_ms',
        'schedule_snapshot_json',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'reviewed_at' => 'datetime',
        'scheduled_due_at' => 'datetime',
        'actual_interval_days' => 'integer',
        'response_time_ms' => 'integer',
        'rating' => ReviewRating::class,
        'schedule_snapshot_json' => 'array',
    ];

    /** @return BelongsTo<User, self> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Card, self> */
    public function card(): BelongsTo
    {
        return $this->belongsTo(Card::class);
    }
}
