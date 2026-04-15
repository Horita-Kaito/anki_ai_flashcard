<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

/**
 * リソースが見つからない時の共通例外基底。
 * 具象例外は label() だけ override すれば良い。
 */
abstract class ResourceNotFoundException extends DomainException
{
    /**
     * ユーザーに見せる日本語のリソース名 (例: "デッキ").
     */
    abstract protected function label(): string;

    /**
     * 指定 ID のリソースが見つからない例外を生成。
     * late static binding により呼び出し元のサブクラスのインスタンスを返す。
     */
    public static function make(int $id): static
    {
        $ref = new \ReflectionClass(static::class);
        $resourceName = str_replace('NotFoundException', '', $ref->getShortName());

        return new static("{$resourceName} #{$id} not found");
    }

    public function statusCode(): int
    {
        return 404;
    }

    public function userMessage(): string
    {
        return "{$this->label()}が見つかりません";
    }
}
