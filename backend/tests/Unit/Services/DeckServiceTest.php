<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Contracts\Repositories\CardRepositoryInterface;
use App\Contracts\Repositories\DeckRepositoryInterface;
use App\Exceptions\Domain\DeckHasCardsException;
use App\Exceptions\Domain\DeckNotFoundException;
use App\Models\Deck;
use App\Services\DeckService;
use Mockery;
use Mockery\MockInterface;
use Tests\TestCase;

final class DeckServiceTest extends TestCase
{
    public function test_存在しないデッキを取得すると例外を投げる(): void
    {
        /** @var DeckRepositoryInterface&MockInterface $repo */
        $repo = Mockery::mock(DeckRepositoryInterface::class);
        $repo->shouldReceive('findForUser')
            ->with(1, 99)
            ->once()
            ->andReturn(null);

        $service = new DeckService($repo, $this->cardRepoStub());

        $this->expectException(DeckNotFoundException::class);
        $service->getForUser(1, 99);
    }

    public function test_自分のデッキを取得できる(): void
    {
        $deck = new Deck(['name' => 'Test']);
        $deck->id = 10;

        /** @var DeckRepositoryInterface&MockInterface $repo */
        $repo = Mockery::mock(DeckRepositoryInterface::class);
        $repo->shouldReceive('findForUser')
            ->with(1, 10)
            ->once()
            ->andReturn($deck);

        $service = new DeckService($repo, $this->cardRepoStub());
        $result = $service->getForUser(1, 10);

        $this->assertSame($deck, $result);
    }

    public function test_作成時はuser_idを渡して委譲する(): void
    {
        $expected = new Deck(['name' => 'New']);

        /** @var DeckRepositoryInterface&MockInterface $repo */
        $repo = Mockery::mock(DeckRepositoryInterface::class);
        $repo->shouldReceive('create')
            ->with(1, ['name' => 'New'])
            ->once()
            ->andReturn($expected);

        $service = new DeckService($repo, $this->cardRepoStub());
        $result = $service->createForUser(1, ['name' => 'New']);

        $this->assertSame($expected, $result);
    }

    public function test_更新前に所有者チェックを行う(): void
    {
        /** @var DeckRepositoryInterface&MockInterface $repo */
        $repo = Mockery::mock(DeckRepositoryInterface::class);
        $repo->shouldReceive('findForUser')
            ->with(1, 99)
            ->once()
            ->andReturn(null);

        $service = new DeckService($repo, $this->cardRepoStub());

        $this->expectException(DeckNotFoundException::class);
        $service->updateForUser(1, 99, ['name' => 'x']);
    }

    public function test_カードが残っているデッキは削除できない(): void
    {
        $deck = new Deck(['name' => 'WithCards']);
        $deck->id = 7;

        /** @var DeckRepositoryInterface&MockInterface $repo */
        $repo = Mockery::mock(DeckRepositoryInterface::class);
        $repo->shouldReceive('findForUser')->with(1, 7)->once()->andReturn($deck);
        $repo->shouldReceive('hasChildren')->with(1, 7)->once()->andReturn(false);

        /** @var CardRepositoryInterface&MockInterface $cardRepo */
        $cardRepo = Mockery::mock(CardRepositoryInterface::class);
        $cardRepo->shouldReceive('countForDeck')->with(1, 7)->once()->andReturn(3);

        $service = new DeckService($repo, $cardRepo);

        $this->expectException(DeckHasCardsException::class);
        $service->deleteForUser(1, 7);
    }

    private function cardRepoStub(): CardRepositoryInterface
    {
        /** @var CardRepositoryInterface&MockInterface $stub */
        $stub = Mockery::mock(CardRepositoryInterface::class);

        return $stub;
    }
}
