<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\Services\AI\AiProviderInterface;
use App\Services\AI\CandidateParser;
use App\Services\AI\FakeAiProvider;
use App\Services\AI\PricingCalculator;
use App\Services\AI\PromptBuilder;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // PromptBuilder / CandidateParser / PricingCalculator は singleton
        $this->app->singleton(PromptBuilder::class, fn () => PromptBuilder::fromConfig());
        $this->app->singleton(CandidateParser::class, fn () => new CandidateParser());
        $this->app->singleton(PricingCalculator::class, fn () => PricingCalculator::fromConfig());

        // AiProviderInterface は config('ai.default_provider') で具象を選択
        $this->app->bind(AiProviderInterface::class, function ($app) {
            $provider = config('ai.default_provider', 'openai');

            return match ($provider) {
                'fake' => $app->make(FakeAiProvider::class),
                // TODO: Phase 2 後半で OpenAiProvider / AnthropicProvider を実装
                'openai' => $app->make(FakeAiProvider::class),
                'anthropic' => $app->make(FakeAiProvider::class),
                'google' => $app->make(FakeAiProvider::class),
                default => throw new \InvalidArgumentException("Unknown AI provider: {$provider}"),
            };
        });
    }

    public function boot(): void
    {
        $this->configureRateLimiters();
    }

    private function configureRateLimiters(): void
    {
        // デフォルト: 60 req/min/user (認証済みは user id、未認証は IP)
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(60)
            ->by($request->user()?->id ?: $request->ip()));

        // AI 生成系: 10 req/hour/user (コスト爆発防止)
        RateLimiter::for('ai-generation', fn (Request $request) => Limit::perHour(10)
            ->by($request->user()?->id ?: $request->ip()));
    }
}
