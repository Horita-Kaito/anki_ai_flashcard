import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUser } from "./endpoints";

export const currentUserKeys = {
  me: ["auth", "me"] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserKeys.me,
    queryFn: fetchCurrentUser,
    staleTime: Infinity,
    retry: false,
  });
}
