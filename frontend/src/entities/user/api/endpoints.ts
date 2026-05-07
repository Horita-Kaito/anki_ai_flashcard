import { apiClient } from "@/shared/api/client";
import { parseApiDataResponse } from "@/shared/api/parse-response";
import type { User } from "@/entities/user/types";
import { userResponseSchema } from "@/entities/user/schemas";

export async function fetchOnboardingStatus(): Promise<{ completed: boolean }> {
  const res = await apiClient.get<{ data: { completed: boolean } }>(
    "/onboarding/status",
  );
  return res.data.data;
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await apiClient.get("/me");
  return parseApiDataResponse(userResponseSchema, res);
}
