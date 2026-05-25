import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSystemSetting, updateSystemSetting } from "./endpoints";
import type { UpdateSystemSettingApiInput } from "../schemas/system-setting-schemas";

export const systemSettingKeys = {
  all: ["admin", "system-settings"] as const,
};

export function useSystemSetting() {
  return useQuery({
    queryKey: systemSettingKeys.all,
    queryFn: fetchSystemSetting,
  });
}

export function useUpdateSystemSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSystemSettingApiInput) =>
      updateSystemSetting(input),
    onSuccess: (data) => {
      qc.setQueryData(systemSettingKeys.all, data);
    },
  });
}
