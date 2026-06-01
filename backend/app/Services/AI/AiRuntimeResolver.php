<?php

declare(strict_types=1);

namespace App\Services\AI;

use App\Contracts\Repositories\UserSettingRepositoryInterface;
use App\Contracts\Services\AI\AiProviderInterface;
use App\Contracts\Services\AI\AiRuntimeResolverInterface;
use Illuminate\Contracts\Container\Container;

final class AiRuntimeResolver implements AiRuntimeResolverInterface
{
    private const SUPPORTED_PROVIDERS = ['openai', 'google'];

    private const DEFAULT_MODELS = [
        'openai' => 'gpt-4o-mini',
        'google' => 'gemini-2.5-flash',
    ];

    public function __construct(
        private readonly UserSettingRepositoryInterface $settingRepository,
        private readonly AiProviderInterface $defaultProvider,
        private readonly Container $container,
    ) {}

    public function resolveForUser(int $userId): AiRuntime
    {
        $setting = $this->settingRepository->findForUser($userId);
        $providerName = (string) ($setting?->default_ai_provider ?: config('ai.default_provider', 'openai'));
        $model = (string) ($setting?->default_ai_model ?: config('ai.default_model', 'gpt-4o-mini'));

        // Tests bind FakeAiProvider directly. Preserve that explicit override regardless of persisted settings.
        if ($this->defaultProvider->name() === 'fake') {
            return new AiRuntime($this->defaultProvider, $model);
        }

        if (! in_array($providerName, self::SUPPORTED_PROVIDERS, true)) {
            $providerName = (string) config('ai.default_provider', 'openai');
            $model = (string) config('ai.default_model', 'gpt-4o-mini');
        }

        if (! in_array($providerName, self::SUPPORTED_PROVIDERS, true)) {
            $providerName = 'openai';
            $model = 'gpt-4o-mini';
        }
        $model = $this->resolveSupportedModel($providerName, $model);

        $provider = $providerName === $this->defaultProvider->name()
            ? $this->defaultProvider
            : $this->container->make("ai.provider.{$providerName}");

        return new AiRuntime($provider, $model);
    }

    private function resolveSupportedModel(string $providerName, string $model): string
    {
        $models = array_keys((array) config("ai.pricing.{$providerName}", []));

        return in_array($model, $models, true)
            ? $model
            : self::DEFAULT_MODELS[$providerName];
    }
}
