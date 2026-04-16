<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\OnboardingRequest;
use App\Services\OnboardingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class OnboardingController extends Controller
{
    public function __construct(
        private readonly OnboardingService $onboardingService,
    ) {}

    public function store(OnboardingRequest $request): JsonResponse
    {
        $user = $request->user();

        if ($user->onboarding_completed_at !== null) {
            return response()->json([
                'data' => ['already_completed' => true],
                'message' => 'オンボーディングは既に完了しています。',
            ], 200);
        }

        $summary = $this->onboardingService->execute(
            user: $user,
            goals: $request->validated('goals'),
        );

        return response()->json([
            'data' => $summary,
            'message' => 'オンボーディングが完了しました。',
        ], 201);
    }

    public function status(Request $request): JsonResponse
    {
        return response()->json([
            'data' => [
                'completed' => $request->user()->onboarding_completed_at !== null,
            ],
        ]);
    }
}
