import { hostname } from "node:os";
import { input, password as passwordPrompt } from "@inquirer/prompts";
import { apiRequest } from "../api.js";
import { configPath, loadConfig, saveConfig } from "../config.js";

interface LoginOptions {
  scope: "full" | "mcp";
  apiUrl?: string;
}

interface TokenResponse {
  token: string;
}

export async function loginCommand(options: LoginOptions): Promise<void> {
  if (options.apiUrl) {
    saveConfig({ ...loadConfig(), apiUrl: options.apiUrl });
  }

  const email = await input({ message: "メールアドレス:" });
  const password = await passwordPrompt({ message: "パスワード:", mask: "*" });

  const res = await apiRequest<TokenResponse>("/tokens", {
    method: "POST",
    auth: false,
    body: {
      email,
      password,
      device_name: `tessera-cli@${hostname()}`,
      scope: options.scope,
    },
  });

  saveConfig({ ...loadConfig(), token: res.token });

  console.log(`ログインしました (scope: ${options.scope})`);
  console.log(`トークンを ${configPath()} に保存しました (権限 0600)。`);
  if (options.scope === "mcp") {
    console.log(
      "注意: mcp スコープでは capture / review は使えません。必要なら --scope full で再ログインしてください。"
    );
  }
}
