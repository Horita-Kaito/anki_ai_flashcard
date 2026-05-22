<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Contracts\Repositories\SystemSettingRepositoryInterface;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSystemSettingRequest;
use App\Http\Resources\Admin\SystemSettingResource;
use Illuminate\Http\JsonResponse;

final class SystemSettingController extends Controller
{
    public function __construct(
        private readonly SystemSettingRepositoryInterface $repository,
    ) {}

    public function show(): JsonResponse
    {
        return (new SystemSettingResource($this->repository->get()))->response();
    }

    public function update(UpdateSystemSettingRequest $request): JsonResponse
    {
        $updated = $this->repository->update($request->validated());

        return (new SystemSettingResource($updated))->response();
    }
}
