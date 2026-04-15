<?php

declare(strict_types=1);

namespace App\Enums;

enum CandidateStatus: string
{
    case Pending = 'pending';
    case Adopted = 'adopted';
    case Rejected = 'rejected';
}
