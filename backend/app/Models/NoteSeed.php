<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\NoteSeedFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
}
