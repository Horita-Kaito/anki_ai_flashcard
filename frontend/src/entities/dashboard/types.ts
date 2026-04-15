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

export interface AiUsage {
  today_calls: number;
  month_calls: number;
  month_cost_usd: number;
}

export interface StreakInfo {
  current: number;
  longest: number;
  today_done: boolean;
}

export interface DashboardSummary {
  due_count_today: number;
  new_cards_count: number;
  total_cards: number;
  recent_notes: RecentNote[];
  recent_cards: RecentCard[];
  ai_usage: AiUsage;
  streak: StreakInfo;
}
