import { apiClient } from "@/shared/api/client";
import type { Deck } from "@/entities/deck/types";
import { deckResponseSchema } from "@/entities/deck/schemas";
import {
  parseApiDataResponse,
  parseApiListResponse,
} from "@/shared/api/parse-response";

/**
 * デッキ一覧を全件取得する (階層表示に必要なため pagination なし)。
 * 階層構造は parent_id と display_order からフロント側で組み立てる。
 */
export async function fetchDeckList(): Promise<Deck[]> {
  const res = await apiClient.get("/decks");
  return parseApiListResponse(deckResponseSchema, res);
}

export async function fetchDeck(id: number): Promise<Deck> {
  const res = await apiClient.get(`/decks/${id}`);
  return parseApiDataResponse(deckResponseSchema, res);
}
