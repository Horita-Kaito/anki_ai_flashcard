import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderWithProviders } from "@/test/render";
import { server } from "@/test/msw/server";
import { NewNotePageClient } from "./new-note-page-client";

const { pushMock, backMock, toastSuccess, toastError } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  backMock: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, back: backMock, replace: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError },
}));

const API = "http://localhost:8000";

describe("NewNotePageClient", () => {
  beforeEach(() => {
    pushMock.mockClear();
    backMock.mockClear();
    toastSuccess.mockClear();
    toastError.mockClear();
  });

  it("連続モード OFF で「保存して候補生成」を押すと候補生成 dispatch 後に /notes/{id} へ遷移する", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewNotePageClient />);

    await user.type(screen.getByLabelText(/メモ本文/), "通常モードのメモ");
    await user.click(
      screen.getByRole("button", { name: /保存して候補生成/ })
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(expect.stringMatching(/^\/notes\/\d+$/));
    });
  });

  it("連続モード ON で送信するとフォームは reset されるが /notes へ遷移しない", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewNotePageClient />);

    // 連続モード toggle を ON
    await user.click(screen.getByRole("checkbox", { name: /続けて作成モード/ }));

    // 「保存」単独ボタンが消えていること
    expect(
      screen.queryByRole("button", { name: /^保存$/ })
    ).not.toBeInTheDocument();

    const body = screen.getByLabelText(/メモ本文/) as HTMLTextAreaElement;
    await user.type(body, "連続モードのメモ");
    await user.click(
      screen.getByRole("button", { name: /保存して候補生成/ })
    );

    // 本文が空になる
    await waitFor(() => {
      expect(
        (screen.getByLabelText(/メモ本文/) as HTMLTextAreaElement).value
      ).toBe("");
    });
    // 遷移は走らない
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("生成 dispatch が失敗してもメモ保存自体は成功扱いで、連続モード OFF なら /notes/{id} に遷移する", async () => {
    server.use(
      http.post(`${API}/api/v1/note-seeds/:id/generate-candidates`, () =>
        HttpResponse.json({ message: "AI error" }, { status: 500 })
      )
    );

    const user = userEvent.setup();
    renderWithProviders(<NewNotePageClient />);

    await user.type(screen.getByLabelText(/メモ本文/), "失敗ケース");
    await user.click(
      screen.getByRole("button", { name: /保存して候補生成/ })
    );

    // メモ保存成功 toast
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("メモを保存しました");
    });
    // 失敗 toast
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        "候補生成の開始に失敗しました。あとで再試行してください"
      );
    });
    // 詳細画面へは遷移する (メモは保存済み)
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        expect.stringMatching(/^\/notes\/\d+$/)
      );
    });
  });
});
