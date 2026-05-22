<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * システム全体の設定 (シングルトン行)。
 *
 * 必ず id=1 の 1 行のみが運用される。SystemSettingRepository::get() を経由して取得すること。
 */
class SystemSetting extends Model
{
    use HasFactory;

    public const SINGLETON_ID = 1;

    /** @var array<int, string> */
    protected $fillable = [
        'monthly_token_limit',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'monthly_token_limit' => 'integer',
    ];

    /**
     * 月次トークン上限を取得する。null または 0 以下は無制限扱い。
     */
    public function effectiveMonthlyTokenLimit(): ?int
    {
        $limit = $this->monthly_token_limit;
        if ($limit === null || $limit <= 0) {
            return null;
        }

        return $limit;
    }
}
