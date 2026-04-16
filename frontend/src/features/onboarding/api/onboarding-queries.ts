import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchOnboardingStatus, submitOnboarding } from "./endpoints";

export const onboardingKeys = {
  all: ["onboarding"] as const,
  status: () => [...onboardingKeys.all, "status"] as const,
};

export function useOnboardingStatus() {
  return useQuery({
    queryKey: onboardingKeys.status(),
    queryFn: fetchOnboardingStatus,
  });
}

export function useSubmitOnboarding() {
  return useMutation({
    mutationFn: submitOnboarding,
  });
}
