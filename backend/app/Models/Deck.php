<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BumpsClientUpdatedAt;
use Database\Factories\DeckFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Deck extends Model
{
    use BumpsClientUpdatedAt;

    /** @use HasFactory<DeckFactory> */
    use HasFactory;

    /** @var array<int, string> */
    protected $fillable = [
        'user_id',
        'client_id',
        'parent_id',
        'name',
        'description',
        'default_domain_template_id',
        'display_order',
        'client_updated_at',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'parent_id' => 'integer',
        'default_domain_template_id' => 'integer',
        'display_order' => 'integer',
        'client_updated_at' => 'datetime',
    ];

    /** @return BelongsTo<User, self> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Deck, self> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /** @return HasMany<Deck> */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }
}
