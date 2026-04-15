import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { DeckList } from "./deck-list";
import { renderWithProviders } from "@/test/render";

describe("DeckList", () => {
  it("MSW のデフォルトデータが表示される", async () => {
    renderWithProviders(<DeckList />);
    const deckName = await screen.findByText("Web開発");
    expect(deckName).toBeInTheDocument();
  });

  it("並び替え用のドラッグハンドルが表示される", async () => {
    renderWithProviders(<DeckList />);
    const handle = await screen.findByRole("button", {
      name: /Web開発 を並び替え/,
    });
    expect(handle).toBeInTheDocument();
  });
});
