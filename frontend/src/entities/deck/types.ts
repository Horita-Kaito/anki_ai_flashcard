/**
 * Deck エンティティ型 (バックエンドの DeckResource と対応)
 */
export interface Deck {
  id: number;
  name: string;
  description: string | null;
  default_domain_template_id: number | null;
  new_cards_limit: number;
  review_limit: number | null;
  created_at: string | null;
  updated_at: string | null;
}

// 後方互換のため shared から re-export
export type {
  PaginationMeta,
  PaginatedResponse,
} from "@/shared/types/pagination";
