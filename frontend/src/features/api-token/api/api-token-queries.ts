import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchApiTokens, issueApiToken, revokeApiToken } from "./endpoints";
import type { IssueTokenInput } from "../schemas/api-token-schemas";

export const apiTokenKeys = {
  all: ["api-tokens"] as const,
  list: () => [...apiTokenKeys.all, "list"] as const,
};

export function useApiTokenList() {
  return useQuery({
    queryKey: apiTokenKeys.list(),
    queryFn: fetchApiTokens,
  });
}

export function useIssueApiToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: IssueTokenInput) => issueApiToken(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: apiTokenKeys.all }),
  });
}

export function useRevokeApiToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tokenId: number) => revokeApiToken(tokenId),
    onSuccess: () => qc.invalidateQueries({ queryKey: apiTokenKeys.all }),
  });
}
