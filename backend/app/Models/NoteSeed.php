<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\NoteSeedFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NoteSeed extends Model
{
    /** @use HasFactory<NoteSeedFactory> */
    use HasFactory;

    /** @var array<int, string> */
    protected $fillable = [
        'user_id',
        'body',
        'domain_template_id',
        'subdomain',
        'learning_goal',
        'note_context',
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

    /** @return HasMany<AiCardCandidate, self> */
    public function candidates(): HasMany
    {
        return $this->hasMany(AiCardCandidate::class);
    }

    /** @return HasMany<AiGenerationLog, self> */
    public function generationLogs(): HasMany
    {
        return $this->hasMany(AiGenerationLog::class);
    }
}
