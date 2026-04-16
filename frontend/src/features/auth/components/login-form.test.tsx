import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/render";
import { LoginForm } from "./login-form";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const API = "http://localhost:8000";

describe("LoginForm", () => {
  beforeEach(() => {
    pushMock.mockClear();

    // デフォルト: オンボーディング完了済み
    server.use(
      http.get(`${API}/api/v1/onboarding/status`, () =>
        HttpResponse.json({ data: { completed: true } })
      )
    );
  });

  it("メールアドレスとパスワードの入力欄が表示される", () => {
    renderWithProviders(<LoginForm />);
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ログイン" })).toBeInTheDocument();
  });

  it("空送信でバリデーションエラーが表示される", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(
        screen.getByText("メールアドレスの形式が正しくありません")
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText("パスワードを入力してください")
    ).toBeInTheDocument();
  });

  it("401 エラー時にサーバーエラーメッセージが表示される", async () => {
    server.use(
      http.post(`${API}/api/v1/login`, () =>
        HttpResponse.json(
          { message: "メールアドレスまたはパスワードが正しくありません" },
          { status: 401 }
        )
      )
    );

    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText("メールアドレス"), "test@example.com");
    await user.type(screen.getByLabelText("パスワード"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "メールアドレスまたはパスワードが正しくありません"
      );
    });
  });

  it("ログイン成功で mutateAsync が呼ばれ /dashboard に遷移する", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText("メールアドレス"), "test@example.com");
    await user.type(screen.getByLabelText("パスワード"), "password123");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });
  });
});
