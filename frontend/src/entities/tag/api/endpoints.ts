import { apiClient } from "@/shared/api/client";
import type { Tag } from "@/entities/tag/types";

export async function fetchTagList(): Promise<Tag[]> {
  const res = await apiClient.get<{ data: Tag[] }>("/tags");
  return res.data.data;
}
