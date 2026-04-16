import { z } from "zod";

export const userResponseSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  })
  .passthrough();

export type UserResponse = z.infer<typeof userResponseSchema>;
