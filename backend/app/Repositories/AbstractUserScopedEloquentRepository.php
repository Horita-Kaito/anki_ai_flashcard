<?php

declare(strict_types=1);

namespace App\Repositories;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * user_id によってスコープされる Eloquent リポジトリの共通実装。
 *
 * PHP にはプロパーなジェネリクスが無いため、具象クラスは各 Interface が
 * 要求する型 (例: ?Deck) を持つ public メソッドを実装しつつ、ここで提供する
 * protected helper (userScopedQuery, createOwnedBy, applyUpdate) を呼び出す。
 *
 * @see docs/06_backend_design.md 3-2 Repository 具象実装
 */
abstract class AbstractUserScopedEloquentRepository
{
    /**
     * 対象 Eloquent モデルのクラス名を返す。
     *
     * @return class-string<Model>
     */
    abstract protected function modelClass(): string;

    /**
     * モデルのベースクエリ。
     */
    protected function baseQuery(): Builder
    {
        $class = $this->modelClass();

        return $class::query();
    }

    /**
     * user_id でスコープされたベースクエリ。
     */
    protected function userScopedQuery(int $userId): Builder
    {
        return $this->baseQuery()->where('user_id', $userId);
    }

    /**
     * 属性に user_id を付与してモデルを作成する。
     *
     * @param  array<string, mixed>  $attributes
     */
    protected function createOwnedBy(int $userId, array $attributes): Model
    {
        $class = $this->modelClass();

        return $class::create([...$attributes, 'user_id' => $userId]);
    }

    /**
     * モデルを更新して refresh 済みインスタンスを返す。
     * eager load が必要な場合は applyEagerLoadsAfterUpdate() を override する。
     *
     * @param  array<string, mixed>  $attributes
     */
    protected function applyUpdate(Model $model, array $attributes): Model
    {
        $model->update($attributes);

        return $model->refresh();
    }
}
