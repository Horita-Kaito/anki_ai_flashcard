import { apiClient } from "@/shared/api/client";
import type { DomainTemplate } from "@/entities/domain-template/types";

export async function fetchDomainTemplateList(): Promise<DomainTemplate[]> {
  const res = await apiClient.get<{ data: DomainTemplate[] }>(
    "/domain-templates"
  );
  return res.data.data;
}

export async function fetchDomainTemplate(
  id: number
): Promise<DomainTemplate> {
  const res = await apiClient.get<{ data: DomainTemplate }>(
    `/domain-templates/${id}`
  );
  return res.data.data;
}
