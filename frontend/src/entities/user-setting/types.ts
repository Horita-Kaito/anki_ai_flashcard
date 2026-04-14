export interface UserSetting {
  default_domain_template_id: number | null;
  daily_new_limit: number;
  daily_review_limit: number;
  default_ai_provider: "openai" | "anthropic" | "google";
  default_ai_model: string;
  default_generation_count: number;
}
