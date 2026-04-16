import { apiClient, fetchCsrfCookie } from "@/shared/api/client";
import type { Deck } from "@/entities/deck/types";
import type {
  CreateDeckInput,
  UpdateDeckInput,
} from "../schemas/deck-schemas";

// Read endpoints (fetchDeckList, fetchDeck) are in entities/deck/api/endpoints.ts

export async function createDeck(input: CreateDeckInput): Promise<Deck> {
  await fetchCsrfCookie();
  const res = await apiClient.post<{ data: Deck }>("/decks", input);
  return res.data.data;
}

export async function updateDeck(
  id: number,
  input: UpdateDeckInput
): Promise<Deck> {
  await fetchCsrfCookie();
  const res = await apiClient.put<{ data: Deck }>(`/decks/${id}`, input);
  return res.data.data;
}

export async function deleteDeck(id: number): Promise<void> {
  await fetchCsrfCookie();
  await apiClient.delete(`/decks/${id}`);
}

export async function reorderDecks(deckIds: number[]): Promise<void> {
  await fetchCsrfCookie();
  await apiClient.post("/decks/reorder", { deck_ids: deckIds });
}
