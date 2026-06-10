import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApiError, apiRequest } from "../src/api.js";
import { saveConfig } from "../src/config.js";

let dir: string;
const fetchMock = vi.fn();

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "tessera-cli-test-"));
  process.env.TESSERA_CONFIG_DIR = dir;
  delete process.env.TESSERA_API_URL;
  delete process.env.TESSERA_TOKEN;
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.TESSERA_CONFIG_DIR;
  vi.unstubAllGlobals();
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiRequest", () => {
  it("Bearer ヘッダー付きで /api/v1 配下を呼ぶ", async () => {
    saveConfig({ apiUrl: "https://api.example.com", token: "1|abc" });
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { ok: true } }));

    await apiRequest("/me");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/me",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer 1|abc" }),
      })
    );
  });

  it("未ログインなら fetch せずにエラーになる", async () => {
    await expect(apiRequest("/me")).rejects.toThrow("tessera login");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("401 では再ログインを促すメッセージになる", async () => {
    saveConfig({ apiUrl: "https://api.example.com", token: "1|expired" });
    fetchMock.mockResolvedValue(jsonResponse(401, { message: "Unauthenticated." }));

    await expect(apiRequest("/me")).rejects.toMatchObject({
      status: 401,
      message: expect.stringContaining("再ログイン"),
    });
  });

  it("403 ではスコープ不足のヒントを出す", async () => {
    saveConfig({ apiUrl: "https://api.example.com", token: "1|mcp-only" });
    fetchMock.mockResolvedValue(jsonResponse(403, { message: "Forbidden" }));

    await expect(apiRequest("/decks")).rejects.toMatchObject({
      status: 403,
      message: expect.stringContaining("--scope full"),
    });
  });

  it("auth: false ならトークンなしで呼べる", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { token: "1|new" }));

    const res = await apiRequest<{ token: string }>("/tokens", {
      method: "POST",
      auth: false,
      body: { email: "a@example.com" },
    });

    expect(res.token).toBe("1|new");
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("ApiError は status を保持する", async () => {
    saveConfig({ apiUrl: "https://api.example.com", token: "1|abc" });
    fetchMock.mockResolvedValue(jsonResponse(429, { message: "Too Many" }));

    await expect(apiRequest("/me")).rejects.toBeInstanceOf(ApiError);
  });
});
