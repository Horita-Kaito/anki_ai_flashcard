import { apiClient, fetchCsrfCookie } from "@/shared/api/client";
import type { Card } from "@/entities/card/types";
import type { PaginatedResponse } from "@/entities/deck/types";
import type {
  CreateCardInput,
  UpdateCardInput,
} from "../schemas/card-schemas";

export async function fetchCardList(
  page = 1,
  perPage = 20,
  deckId?: number
): Promise<PaginatedResponse<Card>> {
  const res = await apiClient.get<PaginatedResponse<Card>>("/cards", {
    params: {
      page,
      per_page: perPage,
      ...(deckId ? { deck_id: deckId } : {}),
    },
  });
  return res.data;
}

export async function fetchCard(id: number): Promise<Card> {
  const res = await apiClient.get<{ data: Card }>(`/cards/${id}`);
  return res.data.data;
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
