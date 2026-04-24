/**
 * Deck エンティティ型 (バックエンドの DeckResource と対応)
 */
export interface Deck {
  id: number;
  parent_id: number | null;
  name: string;
  description: string | null;
  default_domain_template_id: number | null;
  display_order: number;
  /** ルートから自身までのデッキ名配列 (一覧 API のみ付与) */
  path?: string[];
  /** 子デッキがあるかどうか (一覧 API のみ付与) */
  has_children?: boolean;
  created_at: string | null;
  updated_at: string | null;
}

// 後方互換のため shared から re-export
export type {
  PaginationMeta,
  PaginatedResponse,
} from "@/shared/types/pagination";
