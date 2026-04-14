import { apiClient, fetchCsrfCookie } from "@/shared/api/client";
import type { Deck, PaginatedResponse } from "@/entities/deck/types";
import type {
  CreateDeckInput,
  UpdateDeckInput,
} from "../schemas/deck-schemas";

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
