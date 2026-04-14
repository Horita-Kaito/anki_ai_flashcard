<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

/**
 * Repository / Service Interface のバインディング集約点。
 *
 * public $bindings 配列は Laravel が自動的に bind() 相当を適用する。
 * 新規リソース追加時はここにエントリを追加するだけでよい。
 *
 * @see docs/06_backend_design.md 3-5 DIバインディング
 */
final class RepositoryServiceProvider extends ServiceProvider
{
    /**
     * Interface => 具象実装のマッピング (Laravel が自動 bind)
     *
     * @var array<class-string, class-string>
     */
    public array $bindings = [
        // Repositories
        \App\Contracts\Repositories\DeckRepositoryInterface::class => \App\Repositories\EloquentDeckRepository::class,
        \App\Contracts\Repositories\DomainTemplateRepositoryInterface::class => \App\Repositories\EloquentDomainTemplateRepository::class,

        // Services (固定バインド)
        // CardGenerationServiceInterface::class => CardGenerationService::class,
    ];
}
