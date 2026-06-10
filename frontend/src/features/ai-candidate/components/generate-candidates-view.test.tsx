import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/render";
import { GenerateCandidatesView } from "./generate-candidates-view";

const API = "*";

function useNote() {
  server.use(
    http.get(`${API}/api/v1/note-seeds/:id`, ({ params }) =>
      HttpResponse.json({
        data: {
          id: Number(params.id),
          body: "DI は依存を外部から渡すことで差し替えやすくなる",
          domain_template_id: null,
          subdomain: null,
          learning_goal: null,
          note_context: null,
          created_at: "2026-06-01T00:00:00+00:00",
          updated_at: "2026-06-01T00:00:00+00:00",
        },
      })
    )
  );
}

describe("GenerateCandidatesView", () => {
  it("partial success のとき失敗チャンク数とレビュー継続案内を表示する", async () => {
    useNote();
    server.use(
      http.get(
        `${API}/api/v1/note-seeds/:id/generation-status`,
        ({ params }) =>
          HttpResponse.json({
            data: {
              note_seed_id: Number(params.id),
              status: "partial_success",
              candidates_count: 2,
              chunks_failed: 1,
              chunks_total: 3,
            },
          })
      )
    );
    renderWithProviders(<GenerateCandidatesView noteSeedId={1} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "1 / 3 個の塊で失敗しました"
    );
    expect(
      screen.getByText(/生成できた候補はそのままレビューできます/)
    ).toBeInTheDocument();
  });

  it("候補がないとき AI 生成開始 API を呼び出す", async () => {
    useNote();
    let dispatchCount = 0;
    server.use(
      http.post(
        `${API}/api/v1/note-seeds/:id/generate-candidates`,
        ({ params }) => {
          dispatchCount += 1;
          return HttpResponse.json(
            {
              data: {
                note_seed_id: Number(params.id),
                status: "queued",
                candidates_count: 0,
              },
            },
            { status: 202 }
          );
        }
      )
    );
    const user = userEvent.setup();
    renderWithProviders(<GenerateCandidatesView noteSeedId={2} />);

    await user.click(
      await screen.findByRole("button", { name: "AI で候補生成" })
    );
    expect(dispatchCount).toBe(1);
  });
});
