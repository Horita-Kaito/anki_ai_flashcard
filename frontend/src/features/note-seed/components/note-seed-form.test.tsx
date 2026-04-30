import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { NoteSeedForm } from "./note-seed-form";

const pushMock = vi.fn();
const backMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, back: backMock, replace: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("NoteSeedForm", () => {
  beforeEach(() => {
    pushMock.mockClear();
    backMock.mockClear();
  });

  it("必須フィールドが表示される", () => {
    renderWithProviders(<NoteSeedForm />);
    expect(screen.getByLabelText(/メモ本文/)).toBeInTheDocument();
    expect(screen.getByLabelText("分野テンプレート")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /保存/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "キャンセル" })).toBeInTheDocument();
  });

  it("メモ本文が空のまま送信するとバリデーションエラーが表示される", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NoteSeedForm />);

    await user.click(screen.getByRole("button", { name: /保存/ }));

    await waitFor(() => {
      expect(
        screen.getByText("メモ本文を入力してください")
      ).toBeInTheDocument();
    });
  });

  it("送信中は保存ボタンが無効になる", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NoteSeedForm />);

    await user.type(screen.getByLabelText(/メモ本文/), "テストメモ本文です");
    await user.click(screen.getByRole("button", { name: /保存/ }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/notes");
    });
  });

  it("編集モードでは更新ボタンが表示される", () => {
    renderWithProviders(
      <NoteSeedForm
        note={{
          id: 1,
          body: "既存のメモ",
          domain_template_id: null,
          subdomain: null,
          learning_goal: null,
          note_context: null,
          created_at: "2026-04-13T00:00:00+00:00",
          updated_at: "2026-04-13T00:00:00+00:00",
        }}
      />
    );
    expect(screen.getByRole("button", { name: /更新/ })).toBeInTheDocument();
    expect(screen.getByDisplayValue("既存のメモ")).toBeInTheDocument();
  });

  it("フォームが「メモ作成フォーム」のアクセシブル名を持つ", () => {
    renderWithProviders(<NoteSeedForm />);
    expect(
      screen.getByRole("form", { name: "メモ作成フォーム" })
    ).toBeInTheDocument();
  });

  it("プレビュータブに切替えると Markdown がレンダリングされる", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NoteSeedForm />);

    await user.type(
      screen.getByLabelText(/メモ本文/),
      "# 見出し{Enter}{Enter}- 項目"
    );
    await user.click(screen.getByRole("tab", { name: "プレビュー" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "見出し" })
    ).toBeInTheDocument();
    expect(screen.getByText("項目")).toBeInTheDocument();
  });

  it("プレビュータブで本文が空のときは空表示が出る", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NoteSeedForm />);

    await user.click(screen.getByRole("tab", { name: "プレビュー" }));

    expect(
      screen.getByText("プレビューするメモがありません")
    ).toBeInTheDocument();
  });
});
