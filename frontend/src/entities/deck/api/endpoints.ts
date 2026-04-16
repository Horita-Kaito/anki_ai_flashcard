import { apiClient } from "@/shared/api/client";
import type { Deck } from "@/entities/deck/types";
import type { PaginatedResponse } from "@/shared/types/pagination";

export async function fetchDeckList(
  page = 1,
  perPage = 20
): Promise<PaginatedResponse<Deck>> {
  const res = await apiClient.get<PaginatedResponse<Deck>>("/decks", {
    params: { page, per_page: perPage },
  });
  return res.data;
}

export async function fetchDeck(id: number): Promise<Deck> {
  const res = await apiClient.get<{ data: Deck }>(`/decks/${id}`);
  return res.data.data;
}
