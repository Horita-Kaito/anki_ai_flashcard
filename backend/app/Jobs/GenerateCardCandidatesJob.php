<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\AiGenerationLog;
use App\Services\CardGenerationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * メモから AI 候補を非同期生成するジョブ。
 * dispatchGeneration() で作成された queued log を処理し、
 * 成功時は success / 失敗時は failed に状態遷移させる。
 */
final class GenerateCardCandidatesJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /** ジョブ全体のタイムアウト (秒)。AI 呼び出しのリトライを含めても余裕を持たせる。 */
    public int $timeout = 180;

    /**
     * Service 内部で AI 呼び出しのリトライを行うため、Job レベルのリトライは 1 回だけ。
     * (再試行で同じメモに対する候補が二重生成されるのを防ぐ)
     */
    public int $tries = 1;

    /**
     * @param  array<string, mixed>  $options  生成オプション (count / preferred_card_types / domain_template_id / regenerate / additional)
     */
    public function __construct(
        public readonly int $logId,
        public readonly array $options,
    ) {}

    public function handle(CardGenerationService $service): void
    {
        $log = AiGenerationLog::find($this->logId);
        if ($log === null) {
            return;
        }

        // すでに完了済みなら何もしない (再ディスパッチ防止)
        if (! $log->isInFlight()) {
            return;
        }

        try {
            $service->runGeneration($log, $this->options);
        } catch (\Throwable $e) {
            // AI 呼び出し / パース失敗等のドメイン失敗は log.status=failed に既に記録済み。
            // ここでは Throwable を再 throw せず握りつぶして queue の意味のないリトライを抑止する。
            // (queue worker から見るとジョブは成功として記録される。失敗の真実は log.status で参照)
            Log::warning('Card generation domain failure', [
                'log_id' => $this->logId,
                'error' => $e->getMessage(),
            ]);

            $log->refresh();
            if ($log->isInFlight()) {
                // Service が status を更新する前に死んだ稀なケースの保険
                $log->update([
                    'status' => AiGenerationLog::STATUS_FAILED,
                    'error_reason' => mb_substr('[JOB_UNCAUGHT] '.$e->getMessage(), 0, 2000),
                ]);
            }
        }
    }

    /**
     * Job 自体が例外で死んだ場合のフックアップ (handle() 内で catch されなかった例外)。
     * Service 側でも failed への遷移は行うが、Job タイムアウト等で残ったケースの保険。
     */
    public function failed(\Throwable $e): void
    {
        $log = AiGenerationLog::find($this->logId);
        if ($log === null) {
            return;
        }

        if ($log->isInFlight()) {
            $log->update([
                'status' => AiGenerationLog::STATUS_FAILED,
                'error_reason' => mb_substr('[JOB_FAILED] '.$e->getMessage(), 0, 2000),
            ]);
        }
    }
}
