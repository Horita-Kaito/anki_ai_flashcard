<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

use RuntimeException;

/**
 * ドメイン例外の基底クラス。
 * サービス層で throw し、Handler で HTTP レスポンスに変換する。
 */
abstract class DomainException extends RuntimeException
{
    /**
     * この例外に対応する HTTP ステータスコード
     */
    abstract public function statusCode(): int;

    /**
     * ユーザーに見せる短いメッセージ (ドメイン例外は安全に露出してよい)
     */
    public function userMessage(): string
    {
        return $this->getMessage();
    }
}
