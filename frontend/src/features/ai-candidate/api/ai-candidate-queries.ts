import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  adoptCandidate,
  batchAdoptCandidates,
  fetchCandidatesForNote,
  generateCandidates,
  regenerateCandidates,
  rejectCandidate,
  updateCandidate,
  type AdoptInput,
  type BatchAdoptInput,
  type GenerateOptions,
} from "./endpoints";
import type { CandidateStatus } from "@/entities/ai-candidate/types";
import { cardKeys } from "@/features/card/api/card-queries";

export const aiCandidateKeys = {
  all: ["ai-candidates"] as const,
  forNote: (noteSeedId: number, status?: CandidateStatus) =>
    [...aiCandidateKeys.all, "by-note", noteSeedId, status ?? null] as const,
};

export function useCandidatesForNote(
  noteSeedId: number,
  status?: CandidateStatus
) {
  return useQuery({
    queryKey: aiCandidateKeys.forNote(noteSeedId, status),
    queryFn: () => fetchCandidatesForNote(noteSeedId, status),
    enabled: Number.isFinite(noteSeedId) && noteSeedId > 0,
  });
}

export function useGenerateCandidates(noteSeedId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (options: GenerateOptions) =>
      generateCandidates(noteSeedId, options),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiCandidateKeys.all });
    },
  });
}

export function useRegenerateCandidates(noteSeedId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (options: GenerateOptions) =>
      regenerateCandidates(noteSeedId, options),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiCandidateKeys.all });
    },
  });
}

export function useUpdateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number;
      input: { question?: string; answer?: string };
    }) => updateCandidate(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiCandidateKeys.all });
    },
  });
}

export function useRejectCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => rejectCandidate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiCandidateKeys.all });
    },
  });
}

export function useAdoptCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: AdoptInput }) =>
      adoptCandidate(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiCandidateKeys.all });
      qc.invalidateQueries({ queryKey: cardKeys.all });
    },
  });
}

export function useBatchAdoptCandidates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BatchAdoptInput) => batchAdoptCandidates(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiCandidateKeys.all });
      qc.invalidateQueries({ queryKey: cardKeys.all });
    },
  });
}
