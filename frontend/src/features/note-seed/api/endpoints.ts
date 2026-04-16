import { apiClient, fetchCsrfCookie } from "@/shared/api/client";
import type { NoteSeed } from "@/entities/note-seed/types";
import type { PaginatedResponse } from "@/shared/types/pagination";
import type {
  CreateNoteSeedInput,
  UpdateNoteSeedInput,
} from "../schemas/note-seed-schemas";

export interface NoteSeedListFilters {
  domain_template_id?: number;
  q?: string;
}

export async function fetchNoteSeedList(
  page = 1,
  perPage = 20,
  filters: NoteSeedListFilters = {}
): Promise<PaginatedResponse<NoteSeed>> {
  const params: Record<string, string | number> = { page, per_page: perPage };
  if (filters.domain_template_id) {
    params.domain_template_id = filters.domain_template_id;
  }
  if (filters.q && filters.q.trim() !== "") params.q = filters.q;

  const res = await apiClient.get<PaginatedResponse<NoteSeed>>("/note-seeds", {
    params,
  });
  return res.data;
}

// fetchNoteSeed is in entities/note-seed/api/endpoints.ts

export async function createNoteSeed(
  input: CreateNoteSeedInput
): Promise<NoteSeed> {
  await fetchCsrfCookie();
  const res = await apiClient.post<{ data: NoteSeed }>("/note-seeds", input);
  return res.data.data;
}

export async function updateNoteSeed(
  id: number,
  input: UpdateNoteSeedInput
): Promise<NoteSeed> {
  await fetchCsrfCookie();
  const res = await apiClient.put<{ data: NoteSeed }>(
    `/note-seeds/${id}`,
    input
  );
  return res.data.data;
}

export async function deleteNoteSeed(id: number): Promise<void> {
  await fetchCsrfCookie();
  await apiClient.delete(`/note-seeds/${id}`);
}
