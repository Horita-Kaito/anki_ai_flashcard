import { apiClient, fetchCsrfCookie } from "@/shared/api/client";
import type { Tag } from "@/entities/tag/types";
import { tagResponseSchema } from "@/entities/tag/schemas";
import { parseApiListResponse } from "@/shared/api/parse-response";

export async function fetchTagList(): Promise<Tag[]> {
  const res = await apiClient.get("/tags");
  return parseApiListResponse(tagResponseSchema, res);
}

export async function createTag(name: string): Promise<Tag> {
  await fetchCsrfCookie();
  const res = await apiClient.post<{ data: Tag }>("/tags", { name });
  return res.data.data;
}

export async function deleteTag(id: number): Promise<void> {
  await fetchCsrfCookie();
  await apiClient.delete(`/tags/${id}`);
}
