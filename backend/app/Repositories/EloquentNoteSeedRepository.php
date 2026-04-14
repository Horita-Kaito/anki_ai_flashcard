<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\NoteSeedRepositoryInterface;
use App\Models\NoteSeed;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class EloquentNoteSeedRepository implements NoteSeedRepositoryInterface
{
    public function findForUser(int $userId, int $noteSeedId): ?NoteSeed
    {
        return NoteSeed::query()
            ->where('user_id', $userId)
            ->where('id', $noteSeedId)
            ->first();
    }

    public function paginateForUser(int $userId, array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        $templateId = $filters['domain_template_id'] ?? null;
        $keyword = $filters['q'] ?? null;

        return NoteSeed::query()
            ->where('user_id', $userId)
            ->when($templateId !== null, fn ($q) => $q->where('domain_template_id', $templateId))
            ->when($keyword !== null && $keyword !== '', function ($q) use ($keyword) {
                $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $keyword);
                $like = '%'.$escaped.'%';
                $q->where(function ($sub) use ($like) {
                    $sub->where('body', 'like', $like)
                        ->orWhere('learning_goal', 'like', $like)
                        ->orWhere('note_context', 'like', $like);
                });
            })
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->appends(array_filter([
                'domain_template_id' => $templateId,
                'q' => $keyword,
            ], fn ($v) => $v !== null && $v !== ''));
    }

    public function create(int $userId, array $attributes): NoteSeed
    {
        return NoteSeed::create([...$attributes, 'user_id' => $userId]);
    }

    public function update(NoteSeed $noteSeed, array $attributes): NoteSeed
    {
        $noteSeed->update($attributes);

        return $noteSeed->refresh();
    }

    public function delete(NoteSeed $noteSeed): void
    {
        $noteSeed->delete();
    }

    public function recentForUser(int $userId, int $limit = 5): array
    {
        return NoteSeed::query()
            ->where('user_id', $userId)
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->all();
    }
}
