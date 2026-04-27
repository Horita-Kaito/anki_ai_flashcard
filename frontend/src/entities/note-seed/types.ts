export interface NoteSeed {
  id: number;
  body: string;
  domain_template_id: number | null;
  subdomain: string | null;
  learning_goal: string | null;
  note_context: string | null;
  created_at: string | null;
  updated_at: string | null;
  /** 一覧でのみ付与される。レビュー待ちの候補数。 */
  candidates_pending_count?: number;
  /** 一覧でのみ付与される。採用済み (=カード化済み) の候補数。 */
  candidates_adopted_count?: number;
  /** 一覧でのみ付与される。AI 生成依頼の回数 (成功+失敗)。 */
  generation_attempts_count?: number;
}
