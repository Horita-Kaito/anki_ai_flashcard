import { apiClient } from "@/shared/api/client";
import type { NoteSeed } from "@/entities/note-seed/types";
import { noteSeedResponseSchema } from "@/entities/note-seed/schemas";
import { parseApiDataResponse } from "@/shared/api/parse-response";

export async function fetchNoteSeed(id: number): Promise<NoteSeed> {
  const res = await apiClient.get(`/note-seeds/${id}`);
  return parseApiDataResponse(noteSeedResponseSchema, res);
}
