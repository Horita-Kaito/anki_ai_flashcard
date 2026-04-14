<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UserSetting\UpdateUserSettingRequest;
use App\Http\Resources\UserSettingResource;
use App\Services\UserSettingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class UserSettingController extends Controller
{
    public function __construct(
        private readonly UserSettingService $settingService,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $setting = $this->settingService->getOrCreateForUser($request->user()->id);

        return (new UserSettingResource($setting))->response()->setStatusCode(200);
    }

    public function update(UpdateUserSettingRequest $request): JsonResponse
    {
        $setting = $this->settingService->updateForUser(
            userId: $request->user()->id,
            attributes: $request->validated(),
        );

        return (new UserSettingResource($setting))->response()->setStatusCode(200);
    }
}
