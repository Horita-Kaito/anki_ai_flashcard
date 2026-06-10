import { Command } from "commander";
import { ApiError } from "./api.js";
import { captureCommand } from "./commands/capture.js";
import { loginCommand } from "./commands/login.js";
import { mcpCommand } from "./commands/mcp.js";
import { reviewCommand } from "./commands/review.js";

const program = new Command();

program
  .name("tessera")
  .description(
    "Tessera (AIフラッシュカード) CLI: メモ捕捉・復習・MCPブリッジ"
  )
  .version("0.1.0");

program
  .command("login")
  .description("メール/パスワードで認証してトークンを保存する")
  .option("--scope <scope>", "トークンのスコープ (full | mcp)", "full")
  .option("--api-url <url>", "API のベースURL (例: https://app.example.com)")
  .action(async (options: { scope: string; apiUrl?: string }) => {
    if (options.scope !== "full" && options.scope !== "mcp") {
      program.error("--scope は full または mcp を指定してください。");
    }
    await loginCommand({
      scope: options.scope as "full" | "mcp",
      apiUrl: options.apiUrl,
    });
  });

program
  .command("capture [text]")
  .description("テキストをメモ (NoteSeed) として保存する。--file や標準入力も可")
  .option("--file <path>", "ファイルの内容をメモとして保存")
  .action(async (text: string | undefined, options: { file?: string }) => {
    await captureCommand(text, options);
  });

program
  .command("review")
  .description("今日の復習をターミナルで行う")
  .option("--deck <id>", "デッキIDで絞り込む (子デッキも含む)")
  .option("--limit <n>", "最大枚数", "20")
  .action(async (options: { deck?: string; limit: string }) => {
    await reviewCommand(options);
  });

program
  .command("mcp")
  .description("stdio MCP サーバーとして起動し、リモートの Tessera MCP へ中継する")
  .action(async () => {
    await mcpCommand();
  });

program.parseAsync().catch((error: unknown) => {
  if (error instanceof ApiError || error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exit(1);
});
