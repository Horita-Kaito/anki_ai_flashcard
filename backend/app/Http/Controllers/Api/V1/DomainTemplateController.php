<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\DomainTemplate\StoreDomainTemplateRequest;
use App\Http\Requests\DomainTemplate\UpdateDomainTemplateRequest;
use App\Http\Resources\DomainTemplateResource;
use App\Services\DomainTemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class DomainTemplateController extends Controller
{
    public function __construct(
        private readonly DomainTemplateService $templateService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $templates = $this->templateService->listForUser($request->user()->id);

        return DomainTemplateResource::collection($templates)->response();
    }

    public function store(StoreDomainTemplateRequest $request): JsonResponse
    {
        $template = $this->templateService->createForUser(
            userId: $request->user()->id,
            attributes: $request->validated(),
        );

        return (new DomainTemplateResource($template))->response()->setStatusCode(201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $template = $this->templateService->getForUser(
            userId: $request->user()->id,
            templateId: $id,
        );

        return (new DomainTemplateResource($template))->response();
    }

    public function update(UpdateDomainTemplateRequest $request, int $id): JsonResponse
    {
        $template = $this->templateService->updateForUser(
            userId: $request->user()->id,
            templateId: $id,
            attributes: $request->validated(),
        );

        return (new DomainTemplateResource($template))->response();
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->templateService->deleteForUser(
            userId: $request->user()->id,
            templateId: $id,
        );

        return response()->json(null, 204);
    }
}
