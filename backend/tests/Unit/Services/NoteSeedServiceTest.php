<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Contracts\Repositories\CardRepositoryInterface;
use App\Contracts\Repositories\NoteSeedRepositoryInterface;
use App\Exceptions\Domain\NoteSeedNotFoundException;
use App\Models\NoteSeed;
use App\Services\NoteSeedService;
use Illuminate\Support\Facades\DB;
use Mockery;
use Mockery\MockInterface;
use Tests\TestCase;

final class NoteSeedServiceTest extends TestCase
{
    public function test_存在しないメモで例外(): void
    {
        $service = new NoteSeedService(
            $this->noteSeedRepo(findResult: null),
            $this->cardRepo(),
        );

        $this->expectException(NoteSeedNotFoundException::class);
        $service->getForUser(1, 99);
    }

    public function test_削除は既定ではカードを消さない(): void
    {
        DB::shouldReceive('transaction')->andReturnUsing(fn (callable $cb) => $cb());

        $note = new NoteSeed;
        $noteSeedRepo = $this->noteSeedRepo(findResult: $note);
        $noteSeedRepo->shouldReceive('delete')->once()->with($note);

        $cardRepo = $this->cardRepo();
        $cardRepo->shouldNotReceive('deleteBySourceNoteSeedForUser');

        $service = new NoteSeedService($noteSeedRepo, $cardRepo);

        $this->assertSame(0, $service->deleteForUser(1, 5));
    }

    public function test_削除時deleteCards指定でカードも消し件数を返す(): void
    {
        DB::shouldReceive('transaction')->andReturnUsing(fn (callable $cb) => $cb());

        $note = new NoteSeed;
        $noteSeedRepo = $this->noteSeedRepo(findResult: $note);
        $noteSeedRepo->shouldReceive('delete')->once()->with($note);

        $cardRepo = $this->cardRepo();
        $cardRepo->shouldReceive('deleteBySourceNoteSeedForUser')
            ->once()->with(1, 5)->andReturn(3);

        $service = new NoteSeedService($noteSeedRepo, $cardRepo);

        $this->assertSame(3, $service->deleteForUser(1, 5, deleteCards: true));
    }

    /** @return NoteSeedRepositoryInterface&MockInterface */
    private function noteSeedRepo(?NoteSeed $findResult): NoteSeedRepositoryInterface&MockInterface
    {
        /** @var NoteSeedRepositoryInterface&MockInterface $repo */
        $repo = Mockery::mock(NoteSeedRepositoryInterface::class);
        $repo->shouldReceive('findForUser')->andReturn($findResult);

        return $repo;
    }

    /** @return CardRepositoryInterface&MockInterface */
    private function cardRepo(): CardRepositoryInterface&MockInterface
    {
        /** @var CardRepositoryInterface&MockInterface $repo */
        return Mockery::mock(CardRepositoryInterface::class);
    }
}
