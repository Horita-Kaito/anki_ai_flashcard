import { z } from "zod";
import { CARD_TYPES } from "@/entities/card/types";

const instructionSchema = z.object({
  goal: z
    .string()
    .min(1, "学習目的を入力してください")
    .max(500, "学習目的は500文字以内で入力してください"),
  priorities: z
    .array(z.string().min(1).max(200))
    .min(1, "優先観点を1つ以上入力してください"),
  avoid: z.array(z.string().min(1).max(200)).optional(),
  preferred_card_types: z.array(z.enum(CARD_TYPES)).optional(),
  answer_style: z.string().max(200).optional().or(z.literal("")),
  difficulty_policy: z.string().max(200).optional().or(z.literal("")),
  note_interpretation_policy: z.string().max(500).optional().or(z.literal("")),
});

export const createDomainTemplateSchema = z.object({
  name: z.string().min(1, "テンプレート名を入力してください").max(255),
  description: z.string().max(1000).optional().or(z.literal("")),
  instruction_json: instructionSchema,
});

export type CreateDomainTemplateInput = z.infer<
  typeof createDomainTemplateSchema
>;

export const updateDomainTemplateSchema = createDomainTemplateSchema.partial();
export type UpdateDomainTemplateInput = z.infer<
  typeof updateDomainTemplateSchema
>;
