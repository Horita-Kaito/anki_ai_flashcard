<?php

declare(strict_types=1);

namespace App\Enums;

enum CardType: string
{
    case BasicQa = 'basic_qa';
    case Comparison = 'comparison';
    case PracticalCase = 'practical_case';
    case ClozeLike = 'cloze_like';

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
