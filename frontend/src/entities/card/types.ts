/**
 * カード種別 (バックエンドの CardType Enum と対応)
 */
export const CARD_TYPES = [
  "basic_qa",
  "comparison",
  "practical_case",
  "cloze_like",
] as const;

export type CardType = (typeof CARD_TYPES)[number];

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  basic_qa: "基本Q&A",
  comparison: "比較",
  practical_case: "実務ケース",
  cloze_like: "穴埋め",
};

export const SCHEDULE_STATES = ["new", "learning", "review", "relearning"] as const;
export type ScheduleState = (typeof SCHEDULE_STATES)[number];

export const SCHEDULERS = ["sm2", "fsrs"] as const;
export type Scheduler = (typeof SCHEDULERS)[number];

export const SCHEDULER_LABELS: Record<Scheduler, string> = {
  sm2: "SM-2 (シンプル)",
  fsrs: "FSRS (推奨)",
};

export interface CardSchedule {
  state: ScheduleState;
  repetitions: number;
  interval_days: number;
  /** SM-2 のみ。FSRS では null */
  ease_factor: number | null;
  /** FSRS のみ。SM-2 では null */
  stability: number | null;
  /** FSRS のみ。1.0〜10.0 */
  difficulty: number | null;
  due_at: string | null;
  lapse_count: number;
  archived_at: string | null;
}

export interface CardTagSummary {
  id: number;
  name: string;
}

export interface Card {
  id: number;
  deck_id: number;
  domain_template_id: number | null;
  source_note_seed_id: number | null;
  source_ai_candidate_id: number | null;
  question: string;
  answer: string;
  explanation: string | null;
  card_type: CardType;
  is_suspended: boolean;
  scheduler: Scheduler;
  is_archived?: boolean;
  tags?: CardTagSummary[];
  schedule?: CardSchedule | null;
  created_at: string | null;
  updated_at: string | null;
}
