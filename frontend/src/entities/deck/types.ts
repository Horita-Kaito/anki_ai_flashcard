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

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
