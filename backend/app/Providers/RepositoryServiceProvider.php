<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\Repositories\AiCardCandidateRepositoryInterface;
use App\Contracts\Repositories\AiGenerationLogRepositoryInterface;
use App\Contracts\Repositories\CardRepositoryInterface;
use App\Contracts\Repositories\CardReviewRepositoryInterface;
use App\Contracts\Repositories\CardScheduleRepositoryInterface;
use App\Contracts\Repositories\DeckRepositoryInterface;
use App\Contracts\Repositories\DomainTemplateRepositoryInterface;
use App\Contracts\Repositories\NoteSeedRepositoryInterface;
use App\Contracts\Repositories\TagRepositoryInterface;
use App\Contracts\Repositories\UserRepositoryInterface;
use App\Contracts\Repositories\UserSettingRepositoryInterface;
use App\Contracts\Services\Review\SchedulerInterface;
use App\Contracts\Services\Review\SchedulerResolverInterface;
use App\Repositories\EloquentAiCardCandidateRepository;
use App\Repositories\EloquentAiGenerationLogRepository;
use App\Repositories\EloquentCardRepository;
use App\Repositories\EloquentCardReviewRepository;
use App\Repositories\EloquentCardScheduleRepository;
use App\Repositories\EloquentDeckRepository;
use App\Repositories\EloquentDomainTemplateRepository;
use App\Repositories\EloquentNoteSeedRepository;
use App\Repositories\EloquentTagRepository;
use App\Repositories\EloquentUserRepository;
use App\Repositories\EloquentUserSettingRepository;
use App\Services\Review\SchedulerResolver;
use App\Services\Review\Sm2Scheduler;
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
        DeckRepositoryInterface::class => EloquentDeckRepository::class,
        DomainTemplateRepositoryInterface::class => EloquentDomainTemplateRepository::class,
        NoteSeedRepositoryInterface::class => EloquentNoteSeedRepository::class,
        TagRepositoryInterface::class => EloquentTagRepository::class,
        CardRepositoryInterface::class => EloquentCardRepository::class,
        CardScheduleRepositoryInterface::class => EloquentCardScheduleRepository::class,
        UserSettingRepositoryInterface::class => EloquentUserSettingRepository::class,
        UserRepositoryInterface::class => EloquentUserRepository::class,
        AiCardCandidateRepositoryInterface::class => EloquentAiCardCandidateRepository::class,
        AiGenerationLogRepositoryInterface::class => EloquentAiGenerationLogRepository::class,
        CardReviewRepositoryInterface::class => EloquentCardReviewRepository::class,

        // Services (固定バインド)
        SchedulerInterface::class => Sm2Scheduler::class, // legacy 直接注入用 (テスト・後方互換)
    ];

    /**
     * Singleton (リクエスト内で同一インスタンスを使い回す) バインディング。
     * SchedulerResolver は内部にユーザー単位の memo を持つので singleton で運用する。
     *
     * @var array<class-string, class-string>
     */
    public array $singletons = [
        SchedulerResolverInterface::class => SchedulerResolver::class,
    ];
}
