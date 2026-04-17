import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { ReviewCardFlip } from "./review-card-flip";
import type { Card } from "@/entities/card/types";

const mockCard: Card = {
  id: 1,
  deck_id: 1,
  domain_template_id: null,
  source_note_seed_id: null,
  source_ai_candidate_id: null,
  question: "HTTPステータスコード 404 の意味は？",
  answer: "Not Found - リソースが見つからない",
  explanation: "サーバーがリクエストされたリソースを見つけられなかった場合に返される。",
  card_type: "basic_qa",
  is_suspended: false,
  tags: [{ id: 1, name: "HTTP" }],
  schedule: null,
  created_at: "2026-04-13T00:00:00+00:00",
  updated_at: "2026-04-13T00:00:00+00:00",
};

describe("ReviewCardFlip", () => {
  it("初期状態で問題が表示される", () => {
    renderWithProviders(
      <ReviewCardFlip
        card={mockCard}
        showAnswer={false}
        onReveal={vi.fn()}
      />
    );
    expect(
      screen.getByText("HTTPステータスコード 404 の意味は？")
    ).toBeInTheDocument();
    expect(screen.getByText("問題")).toBeInTheDocument();
    expect(screen.getByText("HTTP")).toBeInTheDocument();
  });

  it("クリックで onReveal が呼ばれる", async () => {
    const onReveal = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ReviewCardFlip
        card={mockCard}
        showAnswer={false}
        onReveal={onReveal}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "タップして答えを表示" })
    );
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("Space キーで onReveal が呼ばれる", async () => {
    const onReveal = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ReviewCardFlip
        card={mockCard}
        showAnswer={false}
        onReveal={onReveal}
      />
    );

    const card = screen.getByRole("button", { name: "タップして答えを表示" });
    card.focus();
    await user.keyboard(" ");
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("showAnswer=true で答えが表示される", () => {
    renderWithProviders(
      <ReviewCardFlip
        card={mockCard}
        showAnswer={true}
        onReveal={vi.fn()}
      />
    );
    expect(
      screen.getByText("Not Found - リソースが見つからない")
    ).toBeInTheDocument();
    expect(screen.getByText("答え")).toBeInTheDocument();
    expect(
      screen.getByText(
        "サーバーがリクエストされたリソースを見つけられなかった場合に返される。"
      )
    ).toBeInTheDocument();
  });

  it("disabled 時にクリックしても onReveal が呼ばれない", async () => {
    const onReveal = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ReviewCardFlip
        card={mockCard}
        showAnswer={false}
        onReveal={onReveal}
        disabled
      />
    );

    await user.click(
      screen.getByRole("button", { name: "タップして答えを表示" })
    );
    expect(onReveal).not.toHaveBeenCalled();
  });
});
