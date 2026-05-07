<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Http\Resources\BaseJsonResource;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * 管理者がユーザーを作成した直後にだけ返すリソース。
 *
 * 平文パスワードを **このレスポンスでのみ一度だけ** 返す。
 * 以降のエンドポイントでは絶対に返さない。
 */
final class AdminCreatedUserResource extends BaseJsonResource
{
    public function __construct(
        User $user,
        private readonly string $generatedPassword,
    ) {
        parent::__construct($user);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var User $user */
        $user = $this->resource;

        return [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                ...$this->timestamps(),
            ],
            'generated_password' => $this->generatedPassword,
        ];
    }
}
