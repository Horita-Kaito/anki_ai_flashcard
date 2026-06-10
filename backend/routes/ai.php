<?php

declare(strict_types=1);

use App\Mcp\Servers\TesseraServer;
use Laravel\Mcp\Facades\Mcp;

Mcp::web('/mcp', TesseraServer::class)
    ->middleware(['auth:sanctum', 'throttle:mcp']);
