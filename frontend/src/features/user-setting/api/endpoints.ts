import { apiClient, fetchCsrfCookie } from "@/shared/api/client";
import type { UserSetting } from "@/entities/user-setting/types";
import type { UpdateUserSettingInput } from "../schemas/user-setting-schemas";

export async function fetchUserSetting(): Promise<UserSetting> {
  const res = await apiClient.get<{ data: UserSetting }>("/settings");
  return res.data.data;
}

export async function updateUserSetting(
  input: UpdateUserSettingInput
): Promise<UserSetting> {
  await fetchCsrfCookie();
  const res = await apiClient.put<{ data: UserSetting }>("/settings", input);
  return res.data.data;
}
