import { apiClient } from "@/shared/api/client";
import type { Tag } from "@/entities/tag/types";
import { tagResponseSchema } from "@/entities/tag/schemas";
import { parseApiListResponse } from "@/shared/api/parse-response";

export async function fetchTagList(): Promise<Tag[]> {
  const res = await apiClient.get("/tags");
  return parseApiListResponse(tagResponseSchema, res);
}
