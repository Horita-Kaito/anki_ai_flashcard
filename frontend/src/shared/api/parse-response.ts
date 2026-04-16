import { ZodSchema } from "zod";

export function parseApiResponse<T>(schema: ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function parseApiDataResponse<T>(
  schema: ZodSchema<T>,
  response: { data: { data: unknown } }
): T {
  return schema.parse(response.data.data);
}

export function parseApiListResponse<T>(
  schema: ZodSchema<T>,
  response: { data: { data: unknown[] } }
): T[] {
  return schema.array().parse(response.data.data);
}
