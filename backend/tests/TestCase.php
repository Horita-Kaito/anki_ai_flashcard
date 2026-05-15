<?php

declare(strict_types=1);

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * テスト前に「queue=sync / cache=array / session=array」を強制する。
     *
     * 背景: dev コンテナの環境変数 (QUEUE_CONNECTION=redis 等) が `getenv()`
     * 経由で Laravel に届くため、phpdotenv が immutable で .env.testing を
     * 読んでもオーバーライドできない。Job が sync で実行される前提のテストが
     * queued のまま終わって全滅するので、ここで明示的に config を上書きする。
     */
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'queue.default' => 'sync',
            'cache.default' => 'array',
            'session.driver' => 'array',
        ]);
    }
}
