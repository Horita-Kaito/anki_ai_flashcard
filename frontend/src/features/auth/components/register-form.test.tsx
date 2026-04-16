import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/render";
import { RegisterForm } from "./register-form";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn(), replace: vi.fn() }),
}));

const API = "http://localhost:8000";

describe("RegisterForm", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("名前・メール・パスワード・確認の入力欄が表示される", () => {
    renderWithProviders(<RegisterForm />);
    expect(screen.getByLabelText("名前")).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード (8文字以上)")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード (確認)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登録" })).toBeInTheDocument();
  });

  it("パスワード不一致でバリデーションエラーが表示される", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);

    await user.type(screen.getByLabelText("名前"), "太郎");
    await user.type(screen.getByLabelText("メールアドレス"), "test@example.com");
    await user.type(screen.getByLabelText("パスワード (8文字以上)"), "password123");
    await user.type(screen.getByLabelText("パスワード (確認)"), "different123");
    await user.click(screen.getByRole("button", { name: "登録" }));

    await waitFor(() => {
      expect(screen.getByText("パスワードが一致しません")).toBeInTheDocument();
    });
  });

  it("不正なメールアドレスでバリデーションエラーが表示される", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);

    await user.type(screen.getByLabelText("名前"), "太郎");
    await user.type(screen.getByLabelText("メールアドレス"), "invalid-email");
    await user.type(screen.getByLabelText("パスワード (8文字以上)"), "password123");
    await user.type(screen.getByLabelText("パスワード (確認)"), "password123");
    await user.click(screen.getByRole("button", { name: "登録" }));

    await waitFor(() => {
      expect(
        screen.getByText("メールアドレスの形式が正しくありません")
      ).toBeInTheDocument();
    });
  });

  it("422 エラー時にサーバー側フィールドエラーが表示される", async () => {
    server.use(
      http.post(`${API}/api/v1/register`, () =>
        HttpResponse.json(
          {
            message: "The given data was invalid.",
            errors: {
              email: ["このメールアドレスは既に登録されています"],
            },
          },
          { status: 422 }
        )
      )
    );

    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);

    await user.type(screen.getByLabelText("名前"), "太郎");
    await user.type(screen.getByLabelText("メールアドレス"), "taken@example.com");
    await user.type(screen.getByLabelText("パスワード (8文字以上)"), "password123");
    await user.type(screen.getByLabelText("パスワード (確認)"), "password123");
    await user.click(screen.getByRole("button", { name: "登録" }));

    await waitFor(() => {
      expect(
        screen.getByText("このメールアドレスは既に登録されています")
      ).toBeInTheDocument();
    });
  });
});
