import { apiClient, fetchCsrfCookie } from "@/shared/api/client";
import type { DomainTemplate } from "@/entities/domain-template/types";
import type {
  CreateDomainTemplateInput,
  UpdateDomainTemplateInput,
} from "../schemas/domain-template-schemas";

// Read endpoints (fetchDomainTemplateList, fetchDomainTemplate) are in
// entities/domain-template/api/endpoints.ts

export async function createDomainTemplate(
  input: CreateDomainTemplateInput
): Promise<DomainTemplate> {
  await fetchCsrfCookie();
  const res = await apiClient.post<{ data: DomainTemplate }>(
    "/domain-templates",
    input
  );
  return res.data.data;
}

export async function updateDomainTemplate(
  id: number,
  input: UpdateDomainTemplateInput
): Promise<DomainTemplate> {
  await fetchCsrfCookie();
  const res = await apiClient.put<{ data: DomainTemplate }>(
    `/domain-templates/${id}`,
    input
  );
  return res.data.data;
}

export async function deleteDomainTemplate(id: number): Promise<void> {
  await fetchCsrfCookie();
  await apiClient.delete(`/domain-templates/${id}`);
}
