import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { statSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_API_URL,
  configPath,
  loadConfig,
  saveConfig,
} from "../src/config.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "tessera-cli-test-"));
  process.env.TESSERA_CONFIG_DIR = dir;
  delete process.env.TESSERA_API_URL;
  delete process.env.TESSERA_TOKEN;
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.TESSERA_CONFIG_DIR;
});

describe("config", () => {
  it("ファイルがなければデフォルト値を返す", () => {
    expect(loadConfig()).toEqual({ apiUrl: DEFAULT_API_URL, token: null });
  });

  it("保存した設定を読み戻せる", () => {
    saveConfig({ apiUrl: "https://tessera.example.com", token: "1|abc" });
    expect(loadConfig()).toEqual({
      apiUrl: "https://tessera.example.com",
      token: "1|abc",
    });
  });

  it("設定ファイルは 0600 で保存される", () => {
    saveConfig({ apiUrl: DEFAULT_API_URL, token: "1|secret" });
    const mode = statSync(configPath()).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("環境変数が config.json より優先される", () => {
    saveConfig({ apiUrl: "https://file.example.com", token: "file-token" });
    process.env.TESSERA_API_URL = "https://env.example.com";
    process.env.TESSERA_TOKEN = "env-token";

    expect(loadConfig()).toEqual({
      apiUrl: "https://env.example.com",
      token: "env-token",
    });
  });
});
