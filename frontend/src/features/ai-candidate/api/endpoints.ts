import { apiClient, fetchCsrfCookie } from "@/shared/api/client";
import type { AiCardCandidate, CandidateStatus } from "@/entities/ai-candidate/types";
import type { Card, CardType } from "@/entities/card/types";
import { aiCardCandidateResponseSchema } from "@/entities/ai-candidate/schemas";
import { parseApiListResponse } from "@/shared/api/parse-response";

export interface GenerateOptions {
  count?: number;
  domain_template_id?: number | null;
  preferred_card_types?: CardType[];
}

export interface GenerationMeta {
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  duration_ms: number;
}

export interface GenerationResult {
  candidates: AiCardCandidate[];
  meta: GenerationMeta;
}

export async function generateCandidates(
  noteSeedId: number,
  options: GenerateOptions = {}
): Promise<GenerationResult> {
  await fetchCsrfCookie();
  const res = await apiClient.post<{ data: AiCardCandidate[]; meta: GenerationMeta }>(
    `/note-seeds/${noteSeedId}/generate-candidates`,
    options
  );
  return { candidates: res.data.data, meta: res.data.meta };
}

export async function regenerateCandidates(
  noteSeedId: number,
  options: GenerateOptions = {}
): Promise<GenerationResult> {
  await fetchCsrfCookie();
  const res = await apiClient.post<{ data: AiCardCandidate[]; meta: GenerationMeta }>(
    `/note-seeds/${noteSeedId}/regenerate-candidates`,
    options
  );
  return { candidates: res.data.data, meta: res.data.meta };
}

export async function fetchCandidatesForNote(
  noteSeedId: number,
  status?: CandidateStatus
): Promise<AiCardCandidate[]> {
  const res = await apiClient.get(
    `/note-seeds/${noteSeedId}/candidates`,
    { params: status ? { status } : {} }
  );
  return parseApiListResponse(aiCardCandidateResponseSchema, res);
}

export async function updateCandidate(
  candidateId: number,
  input: { question?: string; answer?: string; explanation?: string | null }
): Promise<AiCardCandidate> {
  await fetchCsrfCookie();
  const res = await apiClient.put<{ data: AiCardCandidate }>(
    `/ai-card-candidates/${candidateId}`,
    input
  );
  return res.data.data;
}

export async function rejectCandidate(
  candidateId: number
): Promise<AiCardCandidate> {
  await fetchCsrfCookie();
  const res = await apiClient.post<{ data: AiCardCandidate }>(
    `/ai-card-candidates/${candidateId}/reject`
  );
  return res.data.data;
}

export async function restoreCandidate(
  candidateId: number
): Promise<AiCardCandidate> {
  await fetchCsrfCookie();
  const res = await apiClient.post<{ data: AiCardCandidate }>(
    `/ai-card-candidates/${candidateId}/restore`
  );
  return res.data.data;
}

export interface AdoptInput {
  deck_id: number;
  question?: string;
  answer?: string;
  explanation?: string | null;
  tag_ids?: number[];
}

export async function adoptCandidate(
  candidateId: number,
  input: AdoptInput
): Promise<Card> {
  await fetchCsrfCookie();
  const res = await apiClient.post<{ data: Card }>(
    `/ai-card-candidates/${candidateId}/adopt`,
    input
  );
  return res.data.data;
}

export interface BatchAdoptInput {
  deck_id: number;
  candidate_ids: number[];
  tag_ids?: number[];
}

export async function batchAdoptCandidates(
  input: BatchAdoptInput
): Promise<{ adopted_count: number; cards: Card[] }> {
  await fetchCsrfCookie();
  const res = await apiClient.post<{
    data: { adopted_count: number; cards: Card[] };
  }>("/ai-card-candidates/batch-adopt", input);
  return res.data.data;
}
