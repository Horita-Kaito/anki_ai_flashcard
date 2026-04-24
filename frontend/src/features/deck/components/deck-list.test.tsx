import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { DeckList } from "./deck-list";
import { renderWithProviders } from "@/test/render";

const API = "http://localhost:8000";

describe("DeckList", () => {
  it("MSW のデフォルトデータが表示される", async () => {
    renderWithProviders(<DeckList />);
    const deckName = await screen.findByText("Web開発");
    expect(deckName).toBeInTheDocument();
  });

  it("ドラッグハンドルが表示される", async () => {
    renderWithProviders(<DeckList />);
    const handle = await screen.findByRole("button", {
      name: /Web開発 をドラッグで並び替え・階層移動/,
    });
    expect(handle).toBeInTheDocument();
  });

  it("ローディング中にスケルトンが表示される", () => {
    server.use(
      http.get(`${API}/api/v1/decks`, () => new Promise(() => {})),
    );
    renderWithProviders(<DeckList />);
    const skeletonItems = screen.getAllByRole("listitem", { hidden: true });
    expect(skeletonItems.length).toBeGreaterThanOrEqual(1);
  });

  it("デッキが0件のとき空状態が表示される", async () => {
    server.use(
      http.get(`${API}/api/v1/decks`, () =>
        HttpResponse.json({ data: [] }),
      ),
    );
    renderWithProviders(<DeckList />);
    const emptyMsg = await screen.findByText("まだデッキがありません");
    expect(emptyMsg).toBeInTheDocument();
    expect(screen.getByText("最初のデッキを作成")).toBeInTheDocument();
  });
});
