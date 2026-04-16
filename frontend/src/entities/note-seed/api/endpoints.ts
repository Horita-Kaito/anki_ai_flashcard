import { apiClient } from "@/shared/api/client";
import type { NoteSeed } from "@/entities/note-seed/types";

export async function fetchNoteSeed(id: number): Promise<NoteSeed> {
  const res = await apiClient.get<{ data: NoteSeed }>(`/note-seeds/${id}`);
  return res.data.data;
}
