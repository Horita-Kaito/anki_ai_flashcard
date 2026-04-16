import { z, ZodSchema } from "zod";

export const paginationMetaSchema = z
  .object({
    current_page: z.number(),
    last_page: z.number(),
    per_page: z.number(),
    total: z.number(),
  })
  .passthrough();

export function paginatedResponseSchema<T>(itemSchema: ZodSchema<T>) {
  return z.object({
    data: z.array(itemSchema),
    meta: paginationMetaSchema,
  });
}
