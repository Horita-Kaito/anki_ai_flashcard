<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Contracts\Repositories\UserRepositoryInterface;
use App\Models\User;
use App\Services\UserCreationService;
use Mockery;
use Mockery\MockInterface;
use Tests\TestCase;

final class UserCreationServiceTest extends TestCase
{
    public function test_create_は_repository_に属性を委譲する(): void
    {
        $expected = new User(['name' => 'k-yamamoto', 'email' => 'k-yamamoto@wown.co.jp']);

        /** @var UserRepositoryInterface&MockInterface $repo */
        $repo = Mockery::mock(UserRepositoryInterface::class);
        $repo->shouldReceive('create')
            ->with([
                'name' => 'k-yamamoto',
                'email' => 'k-yamamoto@wown.co.jp',
                'password' => 'plain-password',
            ])
            ->once()
            ->andReturn($expected);

        $service = new UserCreationService($repo);
        $result = $service->create('k-yamamoto', 'k-yamamoto@wown.co.jp', 'plain-password');

        $this->assertSame($expected, $result);
    }

    public function test_create_with_random_password_は生成パスワードと共に_user_を返す(): void
    {
        $expected = new User(['name' => 'k-yamamoto', 'email' => 'k-yamamoto@wown.co.jp']);

        /** @var UserRepositoryInterface&MockInterface $repo */
        $repo = Mockery::mock(UserRepositoryInterface::class);
        $repo->shouldReceive('create')
            ->withArgs(function (array $attrs): bool {
                return $attrs['name'] === 'k-yamamoto'
                    && $attrs['email'] === 'k-yamamoto@wown.co.jp'
                    && is_string($attrs['password'])
                    && strlen($attrs['password']) >= 16;
            })
            ->once()
            ->andReturn($expected);

        $service = new UserCreationService($repo);
        $result = $service->createWithRandomPassword('k-yamamoto', 'k-yamamoto@wown.co.jp');

        $this->assertSame($expected, $result['user']);
        $this->assertIsString($result['password']);
        $this->assertGreaterThanOrEqual(16, strlen($result['password']));
    }

    public function test_create_with_random_password_は毎回異なるパスワードを生成する(): void
    {
        /** @var UserRepositoryInterface&MockInterface $repo */
        $repo = Mockery::mock(UserRepositoryInterface::class);
        $repo->shouldReceive('create')
            ->twice()
            ->andReturn(new User);

        $service = new UserCreationService($repo);
        $r1 = $service->createWithRandomPassword('a', 'a@example.com');
        $r2 = $service->createWithRandomPassword('b', 'b@example.com');

        $this->assertNotSame($r1['password'], $r2['password']);
    }
}
