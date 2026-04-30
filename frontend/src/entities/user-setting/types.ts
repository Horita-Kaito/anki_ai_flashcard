export interface UserSetting {
  default_domain_template_id: number | null;
  default_ai_provider: "openai" | "anthropic" | "google";
  default_ai_model: string;
  default_generation_count: number;
  /** FSRS 用の目標想起率 (0.7〜0.97) */
  desired_retention: number;
}
