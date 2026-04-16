import { useQuery } from "@tanstack/react-query";
import {
  fetchDomainTemplate,
  fetchDomainTemplateList,
} from "./endpoints";

export const domainTemplateKeys = {
  all: ["domain-templates"] as const,
  list: () => [...domainTemplateKeys.all, "list"] as const,
  detail: (id: number) => [...domainTemplateKeys.all, "detail", id] as const,
};

export function useDomainTemplateList() {
  return useQuery({
    queryKey: domainTemplateKeys.list(),
    queryFn: fetchDomainTemplateList,
  });
}

export function useDomainTemplate(id: number) {
  return useQuery({
    queryKey: domainTemplateKeys.detail(id),
    queryFn: () => fetchDomainTemplate(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}
