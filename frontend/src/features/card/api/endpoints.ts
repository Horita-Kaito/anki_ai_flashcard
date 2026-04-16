import { apiClient, fetchCsrfCookie } from "@/shared/api/client";
import type { Card } from "@/entities/card/types";
import type { PaginatedResponse } from "@/shared/types/pagination";
import type {
  CreateCardInput,
  UpdateCardInput,
} from "../schemas/card-schemas";
import { cardResponseSchema } from "@/entities/card/schemas";
import { paginatedResponseSchema } from "@/shared/types/pagination-schema";
import { parseApiResponse, parseApiDataResponse } from "@/shared/api/parse-response";

const paginatedCardSchema = paginatedResponseSchema(cardResponseSchema);

export interface CardListFilters {
  deck_id?: number;
  tag_id?: number;
  q?: string;
}

export async function fetchCardList(
  page = 1,
  perPage = 20,
  filters: CardListFilters = {}
): Promise<PaginatedResponse<Card>> {
  const params: Record<string, string | number> = {
    page,
    per_page: perPage,
  };
  if (filters.deck_id) params.deck_id = filters.deck_id;
  if (filters.tag_id) params.tag_id = filters.tag_id;
  if (filters.q && filters.q.trim() !== "") params.q = filters.q;

  const res = await apiClient.get("/cards", { params });
  return parseApiResponse(paginatedCardSchema, res.data);
}

export async function fetchCard(id: number): Promise<Card> {
  const res = await apiClient.get(`/cards/${id}`);
  return parseApiDataResponse(cardResponseSchema, res);
}

export async function createCard(input: CreateCardInput): Promise<Card> {
  await fetchCsrfCookie();
  const res = await apiClient.post<{ data: Card }>("/cards", input);
  return res.data.data;
}

export async function updateCard(
  id: number,
  input: UpdateCardInput
): Promise<Card> {
  await fetchCsrfCookie();
  const res = await apiClient.put<{ data: Card }>(`/cards/${id}`, input);
  return res.data.data;
}

export async function deleteCard(id: number): Promise<void> {
  await fetchCsrfCookie();
  await apiClient.delete(`/cards/${id}`);
}
