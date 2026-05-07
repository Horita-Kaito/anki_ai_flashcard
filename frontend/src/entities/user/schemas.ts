import { z } from "zod";

export const userResponseSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    is_admin: z.boolean().optional().default(false),
  })
  .passthrough();

export type UserResponse = z.infer<typeof userResponseSchema>;
