<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiGenerationLog extends Model
{
    use HasFactory;

    /** @var array<int, string> */
    protected $fillable = [
        'user_id',
        'note_seed_id',
        'provider',
        'model_name',
        'prompt_version',
        'input_tokens',
        'output_tokens',
        'cost_usd',
        'duration_ms',
        'status',
        'error_reason',
        'candidates_count',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'input_tokens' => 'integer',
        'output_tokens' => 'integer',
        'cost_usd' => 'decimal:6',
        'duration_ms' => 'integer',
        'candidates_count' => 'integer',
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
}
