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

export type GenerationStatusValue =
  | "idle"
  | "queued"
  | "processing"
  | "success"
  | "failed";

/**
 * 進行中・完了問わずジョブの状態を表す。
 * idle = まだ一度も生成依頼されていない (ログなし)
 */
export interface GenerationStatus {
  id?: number;
  note_seed_id: number;
  status: GenerationStatusValue;
  job_id?: string | null;
  provider?: string;
  model_name?: string;
  candidates_count?: number;
  duration_ms?: number;
  error_reason?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export type GenerationDispatchResult = GenerationStatus;

async function postGeneration(
  path: string,
  options: GenerateOptions
): Promise<GenerationDispatchResult> {
  await fetchCsrfCookie();
  const res = await apiClient.post<{ data: GenerationStatus }>(path, options);
  return res.data.data;
}

export async function generateCandidates(
  noteSeedId: number,
  options: GenerateOptions = {}
): Promise<GenerationDispatchResult> {
  return postGeneration(
    `/note-seeds/${noteSeedId}/generate-candidates`,
    options
  );
}

export async function regenerateCandidates(
  noteSeedId: number,
  options: GenerateOptions = {}
): Promise<GenerationDispatchResult> {
  return postGeneration(
    `/note-seeds/${noteSeedId}/regenerate-candidates`,
    options
  );
}

export async function addMoreCandidates(
  noteSeedId: number,
  options: GenerateOptions = {}
): Promise<GenerationDispatchResult> {
  return postGeneration(
    `/note-seeds/${noteSeedId}/additional-candidates`,
    options
  );
}

export async function fetchGenerationStatus(
  noteSeedId: number
): Promise<GenerationStatus> {
  const res = await apiClient.get<{ data: GenerationStatus }>(
    `/note-seeds/${noteSeedId}/generation-status`
  );
  return res.data.data;
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
  /** 省略時は backend が FSRS をデフォルトに採用する */
  scheduler?: "sm2" | "fsrs";
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
