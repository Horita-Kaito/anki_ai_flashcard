<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Contracts\Repositories\ChatCardizationBatchRepositoryInterface;
use App\Exceptions\Domain\ChatCardizationBatchNotFoundException;
use App\Models\ChatCardizationBatch;
use App\Services\ChatCardizationBatchService;
use Mockery;
use Tests\TestCase;

final class ChatCardizationBatchServiceTest extends TestCase
{
    public function test_get_for_user_returns_batch(): void
    {
        $batch = new ChatCardizationBatch(['user_id' => 1]);
        $batch->id = 10;
        $repository = Mockery::mock(ChatCardizationBatchRepositoryInterface::class);
        $repository->shouldReceive('findForUserWithNotes')
            ->once()
            ->with(1, 10)
            ->andReturn($batch);

        $service = new ChatCardizationBatchService($repository);

        $this->assertSame($batch, $service->getForUser(1, 10));
    }

    public function test_get_for_user_throws_when_missing(): void
    {
        $repository = Mockery::mock(ChatCardizationBatchRepositoryInterface::class);
        $repository->shouldReceive('findForUserWithNotes')
            ->once()
            ->with(1, 99)
            ->andReturn(null);

        $service = new ChatCardizationBatchService($repository);

        $this->expectException(ChatCardizationBatchNotFoundException::class);

        $service->getForUser(1, 99);
    }
}
