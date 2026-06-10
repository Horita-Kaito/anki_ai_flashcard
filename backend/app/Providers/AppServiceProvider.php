<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\Services\AI\AiProviderInterface;
use App\Contracts\Services\AI\AiRuntimeResolverInterface;
use App\Contracts\Services\AI\CandidateQualityValidatorInterface;
use App\Models\User;
use App\Services\AI\AiRuntimeResolver;
use App\Services\AI\CandidateParser;
use App\Services\AI\CandidateQualityValidator;
use App\Services\AI\FakeAiProvider;
use App\Services\AI\GoogleAiProvider;
use App\Services\AI\OpenAiProvider;
use App\Services\AI\PricingCalculator;
use App\Services\AI\PromptBuilder;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Symfony\Component\HttpFoundation\Response;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // PromptBuilder / CandidateParser / PricingCalculator は singleton
        $this->app->singleton(PromptBuilder::class, fn () => PromptBuilder::fromConfig());
        $this->app->singleton(CandidateParser::class, fn () => new CandidateParser);
        $this->app->singleton(PricingCalculator::class, fn () => PricingCalculator::fromConfig());
        $this->app->bind(CandidateQualityValidatorInterface::class, CandidateQualityValidator::class);
        $this->app->bind(AiRuntimeResolverInterface::class, AiRuntimeResolver::class);

        $this->app->bind('ai.provider.fake', fn ($app) => $app->make(FakeAiProvider::class));
        $this->app->bind('ai.provider.openai', fn () => OpenAiProvider::fromConfig());
        $this->app->bind('ai.provider.google', fn () => GoogleAiProvider::fromConfig());

        // AiProviderInterface は config('ai.default_provider') で具象を選択
        $this->app->bind(AiProviderInterface::class, function ($app) {
            $provider = config('ai.default_provider', 'openai');
            if ($provider !== 'fake' && ! array_key_exists($provider, (array) config('ai.selectable_models', []))) {
                $provider = 'openai';
            }

            return match ($provider) {
                'fake' => $app->make('ai.provider.fake'),
                'openai' => $app->make('ai.provider.openai'),
                'google' => $app->make('ai.provider.google'),
            };
        });
    }

    public function boot(): void
    {
        $this->configureRateLimiters();
        $this->configureGates();
    }

    private function configureGates(): void
    {
        Gate::define('access-admin', static function (User $user): bool {
            $email = strtolower((string) $user->email);
            /** @var array<int, string> $allowed */
            $allowed = config('admin.emails', []);

            return in_array($email, $allowed, true);
        });
    }

    private function configureRateLimiters(): void
    {
        // デフォルト: 60 req/min/user (認証済みは user id、未認証は IP)
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(60)
            ->by($request->user()?->id ?: $request->ip()));

        // AI 生成系: 60 req/hour/user (コスト爆発防止)。
        // 失敗レスポンス (4xx/5xx) はカウントしない: AI 呼び出しが失敗した時に
        // ユーザーがすぐ再試行できないと体験を著しく損なうため。月次の累計コスト保護は
        // CardGenerationService::assertMonthlyTokenLimit (system_settings.monthly_token_limit) で行う。
        RateLimiter::for('ai-generation', fn (Request $request) => Limit::perHour(60)
            ->by($request->user()?->id ?: $request->ip())
            ->after(fn (Response $response) => $response->getStatusCode() < 400));

        // 端末間同期: 10 req/min/user。1リクエストで push+pull を行う前提のため
        // 過剰なポーリング・大量バッチの連投を抑止する。
        RateLimiter::for('sync', fn (Request $request) => Limit::perMinute(10)
            ->by($request->user()?->id ?: $request->ip()));
    }
}
