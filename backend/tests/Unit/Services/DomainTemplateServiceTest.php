<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Contracts\Repositories\DomainTemplateRepositoryInterface;
use App\Exceptions\Domain\DomainTemplateNotFoundException;
use App\Models\DomainTemplate;
use App\Services\DomainTemplateService;
use Mockery;
use Mockery\MockInterface;
use Tests\TestCase;

final class DomainTemplateServiceTest extends TestCase
{
    public function test_存在しないテンプレートで例外を投げる(): void
    {
        /** @var DomainTemplateRepositoryInterface&MockInterface $repo */
        $repo = Mockery::mock(DomainTemplateRepositoryInterface::class);
        $repo->shouldReceive('findForUser')->with(1, 99)->andReturn(null);

        $service = new DomainTemplateService($repo);

        $this->expectException(DomainTemplateNotFoundException::class);
        $service->getForUser(1, 99);
    }

    public function test_作成時にuser_idを渡して委譲する(): void
    {
        $expected = new DomainTemplate(['name' => 'X']);
        /** @var DomainTemplateRepositoryInterface&MockInterface $repo */
        $repo = Mockery::mock(DomainTemplateRepositoryInterface::class);
        $repo->shouldReceive('create')
            ->with(1, ['name' => 'X'])
            ->once()
            ->andReturn($expected);

        $service = new DomainTemplateService($repo);

        $this->assertSame($expected, $service->createForUser(1, ['name' => 'X']));
    }
}
