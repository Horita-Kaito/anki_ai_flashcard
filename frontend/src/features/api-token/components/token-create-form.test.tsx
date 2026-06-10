import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/render";
import { TokenCreateForm } from "./token-create-form";

const API = "*";

describe("TokenCreateForm", () => {
  it("トークン名とスコープの入力欄が表示される", () => {
    renderWithProviders(<TokenCreateForm />);

    expect(screen.getByLabelText("トークン名")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /MCP 専用/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /フルアクセス/ })).not.toBeChecked();
  });

  it("空送信でバリデーションエラーが表示される", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TokenCreateForm />);

    await user.click(screen.getByRole("button", { name: "トークンを発行" }));

    expect(
      await screen.findByText("トークン名を入力してください")
    ).toBeInTheDocument();
  });

  it("発行後にプレーンテキストが一度だけ表示され閉じると消える", async () => {
    server.use(
      http.get(`${API}/sanctum/csrf-cookie`, () => new HttpResponse(null, { status: 204 })),
      http.post(`${API}/api/v1/tokens/issue`, () =>
        HttpResponse.json(
          {
            data: { id: 10, name: "claude-mcp", abilities: ["mcp:use"] },
            token: "3|plain-text-token-value",
          },
          { status: 201 }
        )
      ),
      http.get(`${API}/api/v1/tokens`, () => HttpResponse.json({ data: [] }))
    );

    const user = userEvent.setup();
    renderWithProviders(<TokenCreateForm />);

    await user.type(screen.getByLabelText("トークン名"), "claude-mcp");
    await user.click(screen.getByRole("button", { name: "トークンを発行" }));

    const tokenEl = await screen.findByTestId("issued-token");
    expect(tokenEl).toHaveTextContent("3|plain-text-token-value");

    await user.click(screen.getByRole("button", { name: "閉じる" }));

    expect(screen.queryByTestId("issued-token")).not.toBeInTheDocument();
    expect(screen.getByLabelText("トークン名")).toBeInTheDocument();
  });
});
