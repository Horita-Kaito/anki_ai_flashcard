<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * 同期削除の墓標。削除されたレコードを (user_id, entity, client_id) で記録し、
 * pull 時に deleted=true として端末へ配信する。
 */
final class SyncTombstone extends Model
{
    /** @var array<int, string> */
    protected $fillable = [
        'user_id',
        'entity',
        'client_id',
        'client_updated_at',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'client_updated_at' => 'datetime',
    ];

    /** @return BelongsTo<User, self> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
