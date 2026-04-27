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

    /**
     * フロントが分岐可能な機械可読コード (例: JSON_TRUNCATED, SAFETY_BLOCKED)。
     * デフォルトは null (未分類)。サブクラスで上書きする。
     */
    public function errorCode(): ?string
    {
        return null;
    }

    /**
     * デバッグ・運用ログ向けの追加情報 (ai_generation_logs.error_reason に保存される)。
     * デフォルトは null。
     */
    public function debugDetail(): ?string
    {
        return null;
    }
}
