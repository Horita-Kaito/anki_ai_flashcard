import { apiClient, fetchCsrfCookie } from "@/shared/api/client";
import { parseApiDataResponse } from "@/shared/api/parse-response";
import {
  systemSettingResponseSchema,
  type SystemSettingResponse,
  type UpdateSystemSettingApiInput,
} from "../schemas/system-setting-schemas";

export async function fetchSystemSetting(): Promise<SystemSettingResponse> {
  const res = await apiClient.get("/admin/system-settings");
  return parseApiDataResponse(systemSettingResponseSchema, res);
}

export async function updateSystemSetting(
  input: UpdateSystemSettingApiInput
): Promise<SystemSettingResponse> {
  await fetchCsrfCookie();
  const res = await apiClient.put("/admin/system-settings", input);
  return parseApiDataResponse(systemSettingResponseSchema, res);
}
