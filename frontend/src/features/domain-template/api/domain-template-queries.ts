import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createDomainTemplate,
  deleteDomainTemplate,
  updateDomainTemplate,
} from "./endpoints";
import type {
  CreateDomainTemplateInput,
  UpdateDomainTemplateInput,
} from "../schemas/domain-template-schemas";
import { domainTemplateKeys } from "@/entities/domain-template/api/domain-template-queries";

// Re-export entity-level read hooks for internal feature use
export {
  useDomainTemplateList,
  useDomainTemplate,
  domainTemplateKeys,
} from "@/entities/domain-template/api/domain-template-queries";

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
