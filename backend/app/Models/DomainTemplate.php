<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\DomainTemplateFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DomainTemplate extends Model
{
    /** @use HasFactory<DomainTemplateFactory> */
    use HasFactory;

    /** @var array<int, string> */
    protected $fillable = [
        'user_id',
        'name',
        'description',
        'instruction_json',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'instruction_json' => 'array',
    ];

    /** @return BelongsTo<User, self> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
