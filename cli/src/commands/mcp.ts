import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { loadConfig } from "../config.js";

/**
 * stdio <-> Streamable HTTP ブリッジ。
 *
 * stdio しか話せない MCP クライアント (Claude Desktop 等) から、
 * リモートの Tessera MCP サーバー (POST /mcp, Bearer 認証) へ中継する。
 */
export async function mcpCommand(): Promise<void> {
  const { apiUrl, token } = loadConfig();

  if (!token) {
    // stdout は JSON-RPC 用に確保されているため、案内は stderr へ
    console.error(
      "ログインしていません。`tessera login --scope mcp` を実行してください。"
    );
    process.exit(1);
  }

  const remote = new Client({ name: "tessera-cli-bridge", version: "0.1.0" });
  await remote.connect(
    new StreamableHTTPClientTransport(new URL(`${apiUrl}/mcp`), {
      requestInit: {
        headers: { Authorization: `Bearer ${token}` },
      },
    })
  );

  const local = new Server(
    { name: "tessera", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  local.setRequestHandler(ListToolsRequestSchema, async () =>
    remote.listTools()
  );

  local.setRequestHandler(CallToolRequestSchema, async (request) =>
    remote.callTool(request.params)
  );

  await local.connect(new StdioServerTransport());
  console.error(`Tessera MCP ブリッジを開始しました (${apiUrl}/mcp)`);
}
