import type { CardType } from "@/entities/card/types";

export const CANDIDATE_STATUSES = ["pending", "adopted", "rejected"] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export interface AiCardCandidate {
  id: number;
  note_seed_id: number;
  ai_generation_log_id: number | null;
  provider: string;
  model_name: string;
  question: string;
  answer: string;
  card_type: CardType;
  focus_type: string | null;
  rationale: string | null;
  confidence: number | null;
  status: CandidateStatus;
  created_at: string | null;
  updated_at: string | null;
}
