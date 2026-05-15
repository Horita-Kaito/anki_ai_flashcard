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
        'domain_hint',
    ];

    /** @return BelongsTo<User, self> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * 前後空白を除去し、空文字なら null として保存する。
     * 「空白だけ入力されたテンプレ」が list-item 等で『設定済み』に見えるのを防ぐ。
     */
    protected function setDomainHintAttribute(?string $value): void
    {
        if ($value === null) {
            $this->attributes['domain_hint'] = null;

            return;
        }
        $trimmed = trim($value);
        $this->attributes['domain_hint'] = $trimmed === '' ? null : $trimmed;
    }
}
