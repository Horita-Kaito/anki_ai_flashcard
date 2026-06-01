import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/render";
import { ReviewSession } from "./review-session";
import type { Card } from "@/entities/card/types";

const API = "*";

const reviewCard: Card = {
  id: 10,
  deck_id: 1,
  domain_template_id: null,
  source_note_seed_id: null,
  source_ai_candidate_id: null,
  question: "DI の利点は何ですか？",
  answer: "依存を差し替えやすくすること",
  explanation: null,
  card_type: "basic_qa",
  is_suspended: false,
  scheduler: "fsrs",
  schedule: null,
  created_at: "2026-06-01T00:00:00+00:00",
  updated_at: "2026-06-01T00:00:00+00:00",
};

function useTodaySession(cards: Card[] = [reviewCard]) {
  server.use(
    http.get(`${API}/api/v1/review-sessions/today`, () =>
      HttpResponse.json({
        data: {
          total_due: cards.length,
          new_count: cards.length,
          review_count: 0,
          cards,
        },
      })
    )
  );
}

describe("ReviewSession", () => {
  it("答えを表示して評価すると完了画面へ進む", async () => {
    useTodaySession();
    const user = userEvent.setup();
    renderWithProviders(<ReviewSession />);

    expect(await screen.findByText(reviewCard.question)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /答えを見る/ }));
    expect(screen.getByText(reviewCard.answer)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "普通、標準、次回 4日" })
    );

    expect(await screen.findByText("お疲れさまでした")).toBeInTheDocument();
    expect(screen.getByText("1 枚のカードを復習しました")).toBeInTheDocument();
  });

  it("評価ボタンを連打しても回答 API は一度だけ送信する", async () => {
    useTodaySession();
    let answerCount = 0;
    let resolveAnswer: (() => void) | undefined;
    const answerGate = new Promise<void>((resolve) => {
      resolveAnswer = resolve;
    });
    server.use(
      http.post(`${API}/api/v1/review-sessions/answer`, async () => {
        answerCount += 1;
        await answerGate;
        return HttpResponse.json({
          data: {
            card_id: reviewCard.id,
            rating: "good",
            scheduler: "fsrs",
            updated_schedule: {
              state: "review",
              repetitions: 1,
              interval_days: 1,
              ease_factor: null,
              stability: 1,
              difficulty: 5,
              due_at: "2026-06-02T00:00:00+00:00",
              lapse_count: 0,
            },
          },
        });
      })
    );
    renderWithProviders(<ReviewSession />);

    expect(await screen.findByText(reviewCard.question)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /答えを見る/ }));
    const goodButton = screen.getByRole("button", {
      name: "普通、標準、次回 4日",
    });
    fireEvent.click(goodButton);
    fireEvent.click(goodButton);

    await waitFor(() => expect(answerCount).toBe(1));
    resolveAnswer?.();
    expect(await screen.findByText("お疲れさまでした")).toBeInTheDocument();
  });

  it("Space で答えを表示し、数字キーで評価できる", async () => {
    useTodaySession();
    const user = userEvent.setup();
    renderWithProviders(<ReviewSession />);

    expect(await screen.findByText(reviewCard.question)).toBeInTheDocument();
    await user.keyboard(" ");
    expect(screen.getByText(reviewCard.answer)).toBeInTheDocument();

    await user.keyboard("3");
    expect(await screen.findByText("お疲れさまでした")).toBeInTheDocument();
  });
});
