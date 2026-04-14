import type { CardType } from "@/entities/card/types";

/**
 * 分野テンプレートの策問ポリシー (DB の instruction_json と対応)
 */
export interface DomainTemplateInstruction {
  goal: string;
  priorities: string[];
  avoid?: string[];
  preferred_card_types?: CardType[];
  answer_style?: string;
  difficulty_policy?: string;
  note_interpretation_policy?: string;
}

export interface DomainTemplate {
  id: number;
  name: string;
  description: string | null;
  instruction_json: DomainTemplateInstruction;
  created_at: string | null;
  updated_at: string | null;
}
