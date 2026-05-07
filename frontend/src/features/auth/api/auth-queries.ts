import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginUser, logoutUser } from "./endpoints";
import { currentUserKeys, useCurrentUser } from "@/entities/user/api/queries";

export { useCurrentUser };
export const authKeys = currentUserKeys;

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: loginUser,
    onSuccess: (user) => {
      qc.setQueryData(currentUserKeys.me, user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      qc.setQueryData(currentUserKeys.me, null);
      qc.clear();
    },
  });
}
