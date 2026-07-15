import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Suspense } from "react";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/render";
import NoteDetailPage from "./page";

const API = "*";

/**
 * page は `use(params)` で Promise を unwrap して suspend するため、
 * Suspense 境界で包み、初回 render 全体を async act で待つ。
 */
async function renderPage() {
  await act(async () => {
    renderWithProviders(
      <Suspense fallback={null}>
        <NoteDetailPage params={Promise.resolve({ id: "1" })} />
      </Suspense>
    );
  });
}

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn(), replace: vi.fn() }),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

function seedNote(cardsCount: number) {
  server.use(
    http.get(`${API}/api/v1/note-seeds/:id`, ({ params }) =>
      HttpResponse.json({
        data: {
          id: Number(params.id),
          body: "テスト用メモ本文",
          domain_template_id: null,
          subdomain: null,
          learning_goal: null,
          note_context: null,
          created_at: "2026-06-01T00:00:00+00:00",
          updated_at: "2026-06-01T00:00:00+00:00",
          cards_count: cardsCount,
        },
      })
    )
  );
}

describe("NoteDetailPage の削除フロー", () => {
  beforeEach(() => {
    pushMock.mockClear();
    toastSuccess.mockClear();
    toastError.mockClear();
  });

  it("カードがある場合、確認ダイアログにカード削除チェックが既定ONで出て delete_cards=true が送られる", async () => {
    const user = userEvent.setup();
    seedNote(3);

    let deleteCardsParam: string | null = "unset";
    server.use(
      http.delete(`${API}/api/v1/note-seeds/:id`, ({ request }) => {
        deleteCardsParam = new URL(request.url).searchParams.get(
          "delete_cards"
        );
        return HttpResponse.json({
          data: { deleted_cards_count: deleteCardsParam === "true" ? 3 : 0 },
        });
      })
    );

    await renderPage();

    await screen.findByText("テスト用メモ本文");
    await user.click(screen.getByRole("button", { name: "メモを削除" }));

    const dialog = await screen.findByRole("dialog");
    const checkbox = within(dialog).getByRole("checkbox");
    expect(checkbox).toBeChecked();

    await user.click(
      within(dialog).getByRole("button", { name: /メモと 3 枚を削除/ })
    );

    await waitFor(() => expect(deleteCardsParam).toBe("true"));
    expect(toastSuccess).toHaveBeenCalledWith(
      "メモと 3 枚のカードを削除しました"
    );
    expect(pushMock).toHaveBeenCalledWith("/notes");
  });

  it("チェックを外すと delete_cards は送られずカードは残る", async () => {
    const user = userEvent.setup();
    seedNote(2);

    let deleteCardsParam: string | null = "unset";
    server.use(
      http.delete(`${API}/api/v1/note-seeds/:id`, ({ request }) => {
        deleteCardsParam = new URL(request.url).searchParams.get(
          "delete_cards"
        );
        return HttpResponse.json({
          data: { deleted_cards_count: deleteCardsParam === "true" ? 2 : 0 },
        });
      })
    );

    await renderPage();

    await screen.findByText("テスト用メモ本文");
    await user.click(screen.getByRole("button", { name: "メモを削除" }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("checkbox"));
    await user.click(within(dialog).getByRole("button", { name: "メモを削除" }));

    await waitFor(() => expect(deleteCardsParam).toBeNull());
    expect(toastSuccess).toHaveBeenCalledWith("メモを削除しました");
  });

  it("カードが無い場合はチェックボックスを出さない", async () => {
    const user = userEvent.setup();
    seedNote(0);
    server.use(
      http.delete(`${API}/api/v1/note-seeds/:id`, () =>
        HttpResponse.json({ data: { deleted_cards_count: 0 } })
      )
    );

    await renderPage();

    await screen.findByText("テスト用メモ本文");
    await user.click(screen.getByRole("button", { name: "メモを削除" }));

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(/この操作は取り消せません/)
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
