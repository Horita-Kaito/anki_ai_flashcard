import { apiClient, fetchCsrfCookie } from "@/shared/api/client";
import type { UserSetting } from "@/entities/user-setting/types";
import type { UpdateUserSettingInput } from "../schemas/user-setting-schemas";
import { userSettingResponseSchema } from "@/entities/user-setting/schemas";
import { parseApiDataResponse } from "@/shared/api/parse-response";

export async function fetchUserSetting(): Promise<UserSetting> {
  const res = await apiClient.get("/settings");
  return parseApiDataResponse(userSettingResponseSchema, res);
}

export async function updateUserSetting(
  input: UpdateUserSettingInput
): Promise<UserSetting> {
  await fetchCsrfCookie();
  const res = await apiClient.put<{ data: UserSetting }>("/settings", input);
  return res.data.data;
}
