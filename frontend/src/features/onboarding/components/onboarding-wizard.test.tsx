import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/render";
import { OnboardingWizard } from "./onboarding-wizard";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn(), replace: vi.fn() }),
}));

const submitOnboardingMock = vi.fn().mockResolvedValue(undefined);
vi.mock("../api/endpoints", () => ({
  submitOnboarding: (goals: string[]) => submitOnboardingMock(goals),
  fetchOnboardingStatus: vi.fn(),
}));

describe("OnboardingWizard", () => {
  it("ようこそ → 学習目的 → 最初のメモ の順に進み、目的を送信する", async () => {
    const user = userEvent.setup();
    renderWithProviders(<OnboardingWizard userName="かいと" />);

    // Step 1: ようこそ (仕組みの説明)
    expect(
      screen.getByRole("heading", { name: "メモが、明日の記憶になる" })
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "はじめる" }));

    // Step 2: 学習目的。未選択では次へ進めない
    expect(
      screen.getByRole("heading", { name: "何を学んでいますか?" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /資格試験/ }));
    await user.click(screen.getByRole("button", { name: "次へ" }));

    // Step 3: 最初のメモへの誘導
    expect(
      await screen.findByRole("heading", { name: "最初のメモを書いてみましょう" })
    ).toBeInTheDocument();
    expect(submitOnboardingMock).toHaveBeenCalledWith(["exam"]);

    await user.click(screen.getByRole("button", { name: /最初のメモを書く/ }));
    expect(pushMock).toHaveBeenCalledWith("/notes/new");
  });

  it("学習目的ステップから前のステップへ戻れる", async () => {
    const user = userEvent.setup();
    renderWithProviders(<OnboardingWizard />);

    await user.click(screen.getByRole("button", { name: "はじめる" }));
    await user.click(
      screen.getByRole("button", { name: "前のステップへ戻る" })
    );

    expect(
      screen.getByRole("heading", { name: "メモが、明日の記憶になる" })
    ).toBeInTheDocument();
  });
});
