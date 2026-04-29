<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class DeckHasCardsException extends DomainException
{
    public static function make(int $deckId, int $cardCount): self
    {
        return new self(
            "デッキ(id={$deckId})にはカードが{$cardCount}件残っています。"
            .'削除するとカード本体・スケジュール・学習履歴がすべて消失するため、'
            .'先にカードを別デッキへ移動するか個別にアーカイブしてください。'
        );
    }

    public function statusCode(): int
    {
        return 409;
    }
}
