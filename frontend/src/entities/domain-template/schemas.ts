import { z } from "zod";

export const domainTemplateResponseSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    domain_hint: z.string().nullable(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
  })
  .passthrough();

export type DomainTemplateResponse = z.infer<
  typeof domainTemplateResponseSchema
>;
