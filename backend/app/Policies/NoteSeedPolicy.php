<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\NoteSeed;
use App\Models\User;

final class NoteSeedPolicy
{
    public function view(User $user, NoteSeed $noteSeed): bool
    {
        return $noteSeed->user_id === $user->id;
    }

    public function update(User $user, NoteSeed $noteSeed): bool
    {
        return $noteSeed->user_id === $user->id;
    }

    public function delete(User $user, NoteSeed $noteSeed): bool
    {
        return $noteSeed->user_id === $user->id;
    }
}
