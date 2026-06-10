import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/render";
import { TokenList } from "./token-list";

const API = "*";

const TOKENS = [
  {
    id: 1,
    name: "claude-mcp",
    abilities: ["mcp:use"],
    last_used_at: "2026-06-09T10:00:00+09:00",
    created_at: "2026-06-01T10:00:00+09:00",
  },
  {
    id: 2,
    name: "ios-app",
    abilities: ["*"],
    last_used_at: null,
    created_at: "2026-05-01T10:00:00+09:00",
  },
];

describe("TokenList", () => {
  it("トークン一覧をスコープ表示付きで描画する", async () => {
    server.use(
      http.get(`${API}/api/v1/tokens`, () => HttpResponse.json({ data: TOKENS }))
    );

    renderWithProviders(<TokenList />);

    expect(await screen.findByText("claude-mcp")).toBeInTheDocument();
    expect(screen.getByText("ios-app")).toBeInTheDocument();
    expect(screen.getByText("MCP 専用")).toBeInTheDocument();
    expect(screen.getByText("フルアクセス")).toBeInTheDocument();
  });

  it("トークンがない場合は空状態を表示する", async () => {
    server.use(
      http.get(`${API}/api/v1/tokens`, () => HttpResponse.json({ data: [] }))
    );

    renderWithProviders(<TokenList />);

    expect(
      await screen.findByText("発行済みのトークンはありません。")
    ).toBeInTheDocument();
  });

  it("確認ダイアログを経由して失効できる", async () => {
    let deleted = false;
    server.use(
      http.get(`${API}/api/v1/tokens`, () =>
        HttpResponse.json({ data: deleted ? [] : TOKENS })
      ),
      http.get(`${API}/sanctum/csrf-cookie`, () => new HttpResponse(null, { status: 204 })),
      http.delete(`${API}/api/v1/tokens/1`, () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    const user = userEvent.setup();
    renderWithProviders(<TokenList />);

    await screen.findByText("claude-mcp");
    await user.click(screen.getAllByRole("button", { name: "失効" })[0]);

    expect(
      await screen.findByText("トークンを失効しますか?")
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "失効する" }));

    await waitFor(() => expect(deleted).toBe(true));
  });
});
