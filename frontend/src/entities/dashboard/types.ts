export interface RecentNote {
  id: number;
  body: string;
  created_at: string | null;
}

export interface RecentCard {
  id: number;
  question: string;
  created_at: string | null;
}

export interface DashboardSummary {
  due_count_today: number;
  new_cards_count: number;
  total_cards: number;
  recent_notes: RecentNote[];
  recent_cards: RecentCard[];
}
