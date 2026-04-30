<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserSetting extends Model
{
    /** @var array<int, string> */
    protected $fillable = [
        'user_id',
        'default_domain_template_id',
        'default_ai_provider',
        'default_ai_model',
        'default_generation_count',
        'desired_retention',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'default_generation_count' => 'integer',
        'default_domain_template_id' => 'integer',
        'desired_retention' => 'decimal:3',
    ];

    /** @return BelongsTo<User, self> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
