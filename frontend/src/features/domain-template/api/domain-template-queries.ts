import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createDomainTemplate,
  deleteDomainTemplate,
  fetchDomainTemplate,
  fetchDomainTemplateList,
  updateDomainTemplate,
} from "./endpoints";
import type {
  CreateDomainTemplateInput,
  UpdateDomainTemplateInput,
} from "../schemas/domain-template-schemas";

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

export function useCreateDomainTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDomainTemplateInput) =>
      createDomainTemplate(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: domainTemplateKeys.all });
    },
  });
}

export function useUpdateDomainTemplate(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDomainTemplateInput) =>
      updateDomainTemplate(id, input),
    onSuccess: (data) => {
      qc.setQueryData(domainTemplateKeys.detail(id), data);
      qc.invalidateQueries({ queryKey: domainTemplateKeys.all });
    },
  });
}

export function useDeleteDomainTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteDomainTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: domainTemplateKeys.all });
    },
  });
}
