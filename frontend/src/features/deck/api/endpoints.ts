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

/** 階層 + 並び順の一括更新。ドラッグ&ドロップ保存後に呼ぶ。 */
export interface DeckTreeNode {
  id: number;
  parent_id: number | null;
  display_order: number;
}

export async function updateDeckTree(nodes: DeckTreeNode[]): Promise<void> {
  await fetchCsrfCookie();
  await apiClient.post("/decks/tree", { nodes });
}
