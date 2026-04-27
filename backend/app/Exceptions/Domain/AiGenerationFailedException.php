<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class AiGenerationFailedException extends DomainException
{
    public const CODE_TIMEOUT = 'TIMEOUT';

    public const CODE_RATE_LIMITED = 'RATE_LIMITED';

    public const CODE_INVALID_RESPONSE = 'INVALID_RESPONSE';

    public const CODE_JSON_TRUNCATED = 'JSON_TRUNCATED';

    public const CODE_SAFETY_BLOCKED = 'SAFETY_BLOCKED';

    public const CODE_MAX_TOKENS = 'MAX_TOKENS';

    public const CODE_GENERIC = 'GENERIC';

    private function __construct(
        string $message,
        private readonly string $errorKind,
        private readonly ?string $userText = null,
        private readonly ?string $debugDetailText = null,
    ) {
        parent::__construct($message);
    }

    public static function timeout(string $provider): self
    {
        return new self(
            "AI provider {$provider} timed out",
            self::CODE_TIMEOUT,
            'AI の応答がタイムアウトしました。時間をおいて再試行してください。',
        );
    }

    public static function rateLimit(string $provider): self
    {
        return new self(
            "AI provider {$provider} hit rate limit",
            self::CODE_RATE_LIMITED,
            'AI の利用が一時的に制限されています。少し待ってから再試行してください。',
        );
    }

    public static function invalidResponse(string $reason, ?string $debug = null): self
    {
        return new self(
            "AI returned invalid response: {$reason}",
            self::CODE_INVALID_RESPONSE,
            'AI の応答を解析できませんでした。再試行してください。',
            $debug,
        );
    }

    public static function jsonTruncated(string $debug): self
    {
        return new self(
            "AI response JSON truncated: {$debug}",
            self::CODE_JSON_TRUNCATED,
            'AI の出力が途中で打ち切られました。メモを分割するか、再試行してください。',
            $debug,
        );
    }

    public static function safetyBlocked(string $reason): self
    {
        return new self(
            "AI safety filter blocked the response: {$reason}",
            self::CODE_SAFETY_BLOCKED,
            'AI の安全フィルタにより応答がブロックされました。表現を変えて再試行してください。',
            $reason,
        );
    }

    public static function maxTokens(): self
    {
        return new self(
            'AI response stopped at MAX_TOKENS',
            self::CODE_MAX_TOKENS,
            'AI の出力が長すぎて最後まで生成できませんでした。メモを分割するか、再試行してください。',
        );
    }

    public static function generic(string $message): self
    {
        return new self(
            $message,
            self::CODE_GENERIC,
            'AI 生成に失敗しました。時間をおいて再試行してください。',
        );
    }

    public function statusCode(): int
    {
        return 502;
    }

    public function userMessage(): string
    {
        return $this->userText ?? 'AI 生成に失敗しました。時間をおいて再試行してください。';
    }

    public function errorCode(): ?string
    {
        return $this->errorKind;
    }

    public function debugDetail(): ?string
    {
        return $this->debugDetailText;
    }
}
