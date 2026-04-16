import { apiClient } from "@/shared/api/client";
import type { Deck } from "@/entities/deck/types";
import type { PaginatedResponse } from "@/shared/types/pagination";
import { deckResponseSchema } from "@/entities/deck/schemas";
import { paginatedResponseSchema } from "@/shared/types/pagination-schema";
import { parseApiResponse, parseApiDataResponse } from "@/shared/api/parse-response";

const paginatedDeckSchema = paginatedResponseSchema(deckResponseSchema);

export async function fetchDeckList(
  page = 1,
  perPage = 20
): Promise<PaginatedResponse<Deck>> {
  const res = await apiClient.get("/decks", {
    params: { page, per_page: perPage },
  });
  return parseApiResponse(paginatedDeckSchema, res.data);
}

export async function fetchDeck(id: number): Promise<Deck> {
  const res = await apiClient.get(`/decks/${id}`);
  return parseApiDataResponse(deckResponseSchema, res);
}
