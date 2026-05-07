<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Contracts\Services\UserCreationServiceInterface;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreateAdminUserRequest;
use App\Http\Resources\Admin\AdminCreatedUserResource;
use Illuminate\Http\JsonResponse;

final class AdminUserController extends Controller
{
    public function __construct(
        private readonly UserCreationServiceInterface $userCreation,
    ) {}

    public function store(CreateAdminUserRequest $request): JsonResponse
    {
        $result = $this->userCreation->createWithRandomPassword(
            name: $request->string('name')->toString(),
            email: $request->string('email')->toString(),
        );

        return (new AdminCreatedUserResource($result['user'], $result['password']))
            ->response()
            ->setStatusCode(201);
    }
}
