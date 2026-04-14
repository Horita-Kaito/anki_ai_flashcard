<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Deck;
use App\Models\User;

final class DeckPolicy
{
    public function view(User $user, Deck $deck): bool
    {
        return $deck->user_id === $user->id;
    }

    public function update(User $user, Deck $deck): bool
    {
        return $deck->user_id === $user->id;
    }

    public function delete(User $user, Deck $deck): bool
    {
        return $deck->user_id === $user->id;
    }
}
