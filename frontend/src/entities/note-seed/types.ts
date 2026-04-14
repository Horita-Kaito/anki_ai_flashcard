export interface NoteSeed {
  id: number;
  body: string;
  domain_template_id: number | null;
  subdomain: string | null;
  learning_goal: string | null;
  note_context: string | null;
  created_at: string | null;
  updated_at: string | null;
}
