import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { fetchUserSetting, updateUserSetting } from "./endpoints";
import type { UpdateUserSettingInput } from "../schemas/user-setting-schemas";

export const userSettingKeys = {
  current: ["user-settings", "current"] as const,
};

export function useUserSetting() {
  return useQuery({
    queryKey: userSettingKeys.current,
    queryFn: fetchUserSetting,
  });
}

export function useUpdateUserSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateUserSettingInput) => updateUserSetting(input),
    onSuccess: (data) => qc.setQueryData(userSettingKeys.current, data),
  });
}
