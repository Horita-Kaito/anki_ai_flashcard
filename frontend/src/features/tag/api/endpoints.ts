import { apiClient, fetchCsrfCookie } from "@/shared/api/client";
import type { Tag } from "@/entities/tag/types";

// Read endpoint (fetchTagList) is in entities/tag/api/endpoints.ts

export async function createTag(name: string): Promise<Tag> {
  await fetchCsrfCookie();
  const res = await apiClient.post<{ data: Tag }>("/tags", { name });
  return res.data.data;
}

export async function deleteTag(id: number): Promise<void> {
  await fetchCsrfCookie();
  await apiClient.delete(`/tags/${id}`);
}
