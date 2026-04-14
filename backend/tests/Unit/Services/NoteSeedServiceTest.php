<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Contracts\Repositories\NoteSeedRepositoryInterface;
use App\Exceptions\Domain\NoteSeedNotFoundException;
use App\Services\NoteSeedService;
use Mockery;
use Mockery\MockInterface;
use Tests\TestCase;

final class NoteSeedServiceTest extends TestCase
{
    public function test_存在しないメモで例外(): void
    {
        /** @var NoteSeedRepositoryInterface&MockInterface $repo */
        $repo = Mockery::mock(NoteSeedRepositoryInterface::class);
        $repo->shouldReceive('findForUser')->with(1, 99)->andReturn(null);

        $service = new NoteSeedService($repo);

        $this->expectException(NoteSeedNotFoundException::class);
        $service->getForUser(1, 99);
    }
}
