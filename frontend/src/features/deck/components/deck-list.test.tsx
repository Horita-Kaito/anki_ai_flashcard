import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { DeckList } from "./deck-list";
import { renderWithProviders } from "@/test/render";

describe("DeckList", () => {
  it("MSW のデフォルトデータが表示される", async () => {
    renderWithProviders(<DeckList />);
    const link = await screen.findByRole("link", {
      name: /デッキ Web開発 を開く/,
    });
    expect(link).toBeInTheDocument();
  });
});
