export interface UserSetting {
  default_domain_template_id: number | null;
  default_ai_provider: "openai" | "anthropic" | "google";
  default_ai_model: string;
  default_generation_count: number;
}
