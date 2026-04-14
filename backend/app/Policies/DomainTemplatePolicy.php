<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\DomainTemplate;
use App\Models\User;

final class DomainTemplatePolicy
{
    public function view(User $user, DomainTemplate $template): bool
    {
        return $template->user_id === $user->id;
    }

    public function update(User $user, DomainTemplate $template): bool
    {
        return $template->user_id === $user->id;
    }

    public function delete(User $user, DomainTemplate $template): bool
    {
        return $template->user_id === $user->id;
    }
}
