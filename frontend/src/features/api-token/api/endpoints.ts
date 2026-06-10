import { apiClient, fetchCsrfCookie } from "@/shared/api/client";
import type { ApiToken, IssuedApiToken } from "@/entities/api-token/types";
import { apiTokenSchema } from "@/entities/api-token/schemas";
import { parseApiListResponse } from "@/shared/api/parse-response";
import type { IssueTokenInput } from "../schemas/api-token-schemas";

export async function fetchApiTokens(): Promise<ApiToken[]> {
  const res = await apiClient.get<{ data: unknown[] }>("/tokens");
  return parseApiListResponse(apiTokenSchema, res);
}

export async function issueApiToken(
  input: IssueTokenInput
): Promise<IssuedApiToken> {
  await fetchCsrfCookie();
  const res = await apiClient.post<{
    data: { id: number; name: string; abilities: string[] };
    token: string;
  }>("/tokens/issue", input);

  return { ...res.data.data, token: res.data.token };
}

export async function revokeApiToken(tokenId: number): Promise<void> {
  await fetchCsrfCookie();
  await apiClient.delete(`/tokens/${tokenId}`);
}
