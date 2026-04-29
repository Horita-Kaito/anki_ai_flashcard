import { apiClient } from "@/shared/api/client";

export async function fetchOnboardingStatus(): Promise<{ completed: boolean }> {
  const res = await apiClient.get<{ data: { completed: boolean } }>(
    "/onboarding/status",
  );
  return res.data.data;
}
