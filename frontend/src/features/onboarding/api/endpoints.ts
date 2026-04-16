import { apiClient, fetchCsrfCookie } from "@/shared/api/client";

export async function submitOnboarding(goals: string[]): Promise<void> {
  await fetchCsrfCookie();
  await apiClient.post("/onboarding", { goals });
}

export async function fetchOnboardingStatus(): Promise<{ completed: boolean }> {
  const res = await apiClient.get<{ data: { completed: boolean } }>(
    "/onboarding/status",
  );
  return res.data.data;
}
