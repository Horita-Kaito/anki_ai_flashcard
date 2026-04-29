import { apiClient, fetchCsrfCookie } from "@/shared/api/client";

export async function submitOnboarding(goals: string[]): Promise<void> {
  await fetchCsrfCookie();
  await apiClient.post("/onboarding", { goals });
}

// onboarding ステータス取得は cross-feature でも使うため entities/user/api に移動済み。
// 後方互換のための re-export。
export { fetchOnboardingStatus } from "@/entities/user/api/endpoints";
