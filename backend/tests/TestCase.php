<?php

declare(strict_types=1);

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * RefreshDatabase が実 DB (dev MySQL) を migrate:fresh してしまう事故を防ぐ。
     *
     * setUpTraits は RefreshDatabase のマイグレーション実行より前に呼ばれるため、
     * ここで接続先が sqlite :memory: であることを検証してから処理を続ける。
     */
    protected function setUpTraits(): array
    {
        $connection = $this->app['config']->get('database.default');
        $database = $this->app['config']->get("database.connections.{$connection}.database");

        if ($connection !== 'sqlite' || $database !== ':memory:') {
            throw new \RuntimeException(
                "テストは sqlite :memory: に対してのみ実行できます (現在: {$connection} / {$database})。"
                .' 実 DB の破壊を防ぐため中断しました。phpunit.xml の <server> 強制設定を確認してください。'
            );
        }

        return parent::setUpTraits();
    }

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
