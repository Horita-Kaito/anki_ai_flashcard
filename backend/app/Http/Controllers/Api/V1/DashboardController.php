<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardService $dashboardService,
    ) {}

    public function summary(Request $request): JsonResponse
    {
        $summary = $this->dashboardService->summaryForUser($request->user()->id);

        return response()->json([
            'data' => [
                'due_count_today' => $summary['due_count_today'],
                'new_cards_count' => $summary['new_cards_count'],
                'total_cards' => $summary['total_cards'],
                'recent_notes' => array_map(fn ($n) => [
                    'id' => $n->id,
                    'body' => mb_substr($n->body, 0, 80),
                    'created_at' => $n->created_at?->toIso8601String(),
                ], $summary['recent_notes']),
                'recent_cards' => array_map(fn ($c) => [
                    'id' => $c->id,
                    'question' => mb_substr($c->question, 0, 80),
                    'created_at' => $c->created_at?->toIso8601String(),
                ], $summary['recent_cards']),
                'ai_usage' => [
                    'today_calls' => $summary['ai_usage']['today_calls'],
                    'month_calls' => $summary['ai_usage']['month_calls'],
                    'month_cost_usd' => round($summary['ai_usage']['month_cost_usd'], 6),
                ],
            ],
        ]);
    }
}
