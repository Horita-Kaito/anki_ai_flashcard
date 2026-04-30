<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ScheduleState;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CardSchedule extends Model
{
    use HasFactory;

    /** @var array<int, string> */
    protected $fillable = [
        'user_id',
        'card_id',
        'repetitions',
        'interval_days',
        'ease_factor',
        'stability',
        'difficulty',
        'due_at',
        'last_reviewed_at',
        'lapse_count',
        'state',
        'archived_at',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'repetitions' => 'integer',
        'interval_days' => 'integer',
        'ease_factor' => 'decimal:2',
        'stability' => 'decimal:4',
        'difficulty' => 'decimal:2',
        'due_at' => 'datetime',
        'last_reviewed_at' => 'datetime',
        'lapse_count' => 'integer',
        'state' => ScheduleState::class,
        'archived_at' => 'datetime',
    ];

    /** @return BelongsTo<Card, self> */
    public function card(): BelongsTo
    {
        return $this->belongsTo(Card::class);
    }
}
