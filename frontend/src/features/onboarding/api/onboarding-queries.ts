import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchOnboardingStatus, submitOnboarding } from "./endpoints";

export const onboardingKeys = {
  all: ["onboarding"] as const,
  status: () => [...onboardingKeys.all, "status"] as const,
};

/**
 * オンボーディング完了状態を取得する。
 *
 * @param enabled - false を渡すとクエリを一時停止できる (認証確認前など)
 */
export function useOnboardingStatus(enabled = true) {
  return useQuery({
    queryKey: onboardingKeys.status(),
    queryFn: fetchOnboardingStatus,
    enabled,
    retry: false,
    staleTime: 30_000,
  });
}

export function useSubmitOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: submitOnboarding,
    onSuccess: () => {
      // 完了後にステータスキャッシュを即時更新
      qc.setQueryData(onboardingKeys.status(), { completed: true });
    },
  });
}
