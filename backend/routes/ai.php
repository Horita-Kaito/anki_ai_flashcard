<?php

declare(strict_types=1);

use App\Http\Middleware\EnsureMcpAbility;
use App\Mcp\Servers\TesseraServer;
use Laravel\Mcp\Facades\Mcp;

// auth:sanctum,api: Sanctum PAT / SPA Cookie と Passport OAuth (MCP コネクタ) の両対応。
Mcp::web('/mcp', TesseraServer::class)
    ->middleware(['auth:sanctum,api', 'throttle:mcp', EnsureMcpAbility::class]);

// RFC 8414 メタデータ + 動的クライアント登録 (claude.ai / ChatGPT コネクタ用)
Mcp::oauthRoutes();
