import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface CliConfig {
  apiUrl: string;
  token: string | null;
}

export const DEFAULT_API_URL = "http://localhost:8000";

export function configDir(): string {
  return (
    process.env.TESSERA_CONFIG_DIR ?? join(homedir(), ".config", "tessera")
  );
}

export function configPath(): string {
  return join(configDir(), "config.json");
}

/**
 * 設定の優先順位: 環境変数 (TESSERA_API_URL / TESSERA_TOKEN) > config.json > デフォルト
 */
export function loadConfig(): CliConfig {
  let fileConfig: Partial<CliConfig> = {};
  try {
    fileConfig = JSON.parse(readFileSync(configPath(), "utf8")) as Partial<CliConfig>;
  } catch {
    // 初回実行など、ファイルがなければデフォルトにフォールバック
  }

  return {
    apiUrl:
      process.env.TESSERA_API_URL ?? fileConfig.apiUrl ?? DEFAULT_API_URL,
    token: process.env.TESSERA_TOKEN ?? fileConfig.token ?? null,
  };
}

/**
 * トークンを含むため 0600 で保存する。
 */
export function saveConfig(config: CliConfig): void {
  mkdirSync(configDir(), { recursive: true, mode: 0o700 });
  writeFileSync(configPath(), `${JSON.stringify(config, null, 2)}\n`, {
    mode: 0o600,
  });
  chmodSync(configPath(), 0o600);
}
