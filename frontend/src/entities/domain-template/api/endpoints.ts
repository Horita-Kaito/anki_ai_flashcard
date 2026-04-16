import { apiClient } from "@/shared/api/client";
import type { DomainTemplate } from "@/entities/domain-template/types";
import { domainTemplateResponseSchema } from "@/entities/domain-template/schemas";
import { parseApiDataResponse, parseApiListResponse } from "@/shared/api/parse-response";

export async function fetchDomainTemplateList(): Promise<DomainTemplate[]> {
  const res = await apiClient.get("/domain-templates");
  return parseApiListResponse(domainTemplateResponseSchema, res);
}

export async function fetchDomainTemplate(
  id: number
): Promise<DomainTemplate> {
  const res = await apiClient.get(`/domain-templates/${id}`);
  return parseApiDataResponse(domainTemplateResponseSchema, res);
}
