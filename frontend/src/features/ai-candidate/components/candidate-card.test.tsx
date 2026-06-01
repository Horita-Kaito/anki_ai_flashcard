import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/render";
import { CandidateCard } from "./candidate-card";
import type { AiCardCandidate } from "@/entities/ai-candidate/types";

const API = "*";

const candidate: AiCardCandidate = {
  id: 20,
  note_seed_id: 1,
  ai_generation_log_id: 1,
  provider: "fake",
  model_name: "fake-model",
  question: "DI とは何ですか？",
  answer: "依存を外部から渡す設計です",
  card_type: "basic_qa",
  focus_type: "definition",
  rationale: "概念の定義を確認するため",
  explanation: null,
  confidence: 0.9,
  suggested_deck_id: null,
  status: "pending",
  created_at: "2026-06-01T00:00:00+00:00",
  updated_at: "2026-06-01T00:00:00+00:00",
};

describe("CandidateCard", () => {
  it("デッキを選択すると候補をカードとして採用できる", async () => {
    let adoptedBody: unknown;
    server.use(
      http.post(
        `${API}/api/v1/ai-card-candidates/:id/adopt`,
        async ({ request }) => {
          adoptedBody = await request.json();
          return HttpResponse.json(
            {
              data: {
                id: 999,
                deck_id: 1,
                question: candidate.question,
                answer: candidate.answer,
              },
            },
            { status: 201 }
          );
        }
      )
    );
    const user = userEvent.setup();
    renderWithProviders(<CandidateCard candidate={candidate} />);

    const adoptButton = screen.getByRole("button", {
      name: "採用して復習に回す",
    });
    expect(adoptButton).toBeDisabled();

    const deckSelect = await screen.findByRole("combobox", {
      name: "採用先のデッキ",
    });
    await screen.findByRole("option", { name: "Web開発" });
    await user.selectOptions(deckSelect, "1");
    expect(adoptButton).toBeEnabled();
    await user.click(adoptButton);

    await waitFor(() =>
      expect(adoptedBody).toEqual({
        deck_id: 1,
        question: candidate.question,
        answer: candidate.answer,
        explanation: null,
      })
    );
  });

  it("編集内容を保存 API に送信し、表示へ反映する", async () => {
    let updateBody: unknown;
    server.use(
      http.put(
        `${API}/api/v1/ai-card-candidates/:id`,
        async ({ request }) => {
          updateBody = await request.json();
          return HttpResponse.json({ data: { ...candidate, ...updateBody } });
        }
      )
    );
    const user = userEvent.setup();
    renderWithProviders(<CandidateCard candidate={candidate} />);

    await user.click(screen.getByRole("button", { name: "編集" }));
    const question = screen.getByRole("textbox", { name: "問題文" });
    await user.clear(question);
    await user.type(question, "DI の主な利点は何ですか？");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() =>
      expect(updateBody).toEqual({
        question: "DI の主な利点は何ですか？",
        answer: candidate.answer,
        explanation: null,
      })
    );
    expect(screen.getByText("DI の主な利点は何ですか？")).toBeInTheDocument();
  });
});
