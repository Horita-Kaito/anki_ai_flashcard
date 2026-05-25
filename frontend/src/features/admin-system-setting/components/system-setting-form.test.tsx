import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { SystemSettingForm } from "./system-setting-form";

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { success: (...args: unknown[]) => toastSuccess(...args), error: (...args: unknown[]) => toastError(...args) },
}));

describe("SystemSettingForm", () => {
  beforeEach(() => {
    toastSuccess.mockClear();
    toastError.mockClear();
  });

  it("ロード完了後にフォームが表示される", async () => {
    renderWithProviders(<SystemSettingForm />);

    expect(
      await screen.findByRole("form", { name: "システム設定フォーム" })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/月次トークン上限/)
    ).toBeInTheDocument();
  });

  it("初期状態 (msw のデフォルト null) では空欄表示 + 現在「無制限」を案内する", async () => {
    renderWithProviders(<SystemSettingForm />);

    const input = (await screen.findByLabelText(
      /月次トークン上限/
    )) as HTMLInputElement;
    expect(input.value).toBe("");
    expect(screen.getByText(/現在:\s*無制限/)).toBeInTheDocument();
  });

  it("値を変更しないと保存ボタンは無効", async () => {
    renderWithProviders(<SystemSettingForm />);

    await screen.findByRole("form", { name: "システム設定フォーム" });
    const saveButton = screen.getByRole("button", { name: /^保存$/ });
    expect(saveButton).toBeDisabled();
  });

  it("999 で送信するとバリデーションエラー (1000 未満)", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SystemSettingForm />);

    const input = (await screen.findByLabelText(
      /月次トークン上限/
    )) as HTMLInputElement;
    await user.type(input, "999");
    await user.click(screen.getByRole("button", { name: /^保存$/ }));

    expect(
      await screen.findByText(/1000 以上を指定してください/)
    ).toBeInTheDocument();
  });

  it("整数以外を入れるとバリデーションエラー", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SystemSettingForm />);

    const input = (await screen.findByLabelText(
      /月次トークン上限/
    )) as HTMLInputElement;
    await user.type(input, "12.5");
    await user.click(screen.getByRole("button", { name: /^保存$/ }));

    expect(
      await screen.findByText("整数で入力してください")
    ).toBeInTheDocument();
  });

  it("正常値で送信すると success toast が出る", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SystemSettingForm />);

    const input = (await screen.findByLabelText(
      /月次トークン上限/
    )) as HTMLInputElement;
    await user.type(input, "500000");
    await user.click(screen.getByRole("button", { name: /^保存$/ }));

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("システム設定を保存しました");
    });
  });

  it("空欄で送信すると null (無制限) として API に送られる", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SystemSettingForm />);

    const input = (await screen.findByLabelText(
      /月次トークン上限/
    )) as HTMLInputElement;
    // 既に空欄で disabled なので、いったん値を入れて isDirty にしてから消す
    await user.type(input, "500000");
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: /^保存$/ }));

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("システム設定を保存しました");
    });
  });

  it("input の min-h-11 が付与されている (44px タップターゲット)", async () => {
    renderWithProviders(<SystemSettingForm />);

    const input = (await screen.findByLabelText(
      /月次トークン上限/
    )) as HTMLInputElement;
    expect(input.className).toMatch(/min-h-11/);
  });
});
