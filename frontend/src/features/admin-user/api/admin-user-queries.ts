import { useMutation } from "@tanstack/react-query";
import { createAdminUser } from "./endpoints";

export const adminUserKeys = {
  all: ["admin-users"] as const,
};

export function useCreateAdminUser() {
  return useMutation({
    mutationFn: createAdminUser,
  });
}
