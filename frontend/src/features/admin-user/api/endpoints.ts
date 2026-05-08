import { apiClient, fetchCsrfCookie } from "@/shared/api/client";
import { parseApiDataResponse } from "@/shared/api/parse-response";
import {
  adminCreatedUserResponseSchema,
  type AdminCreatedUserResponse,
  type CreateAdminUserInput,
} from "../schemas/admin-user-schemas";

export async function createAdminUser(
  input: CreateAdminUserInput
): Promise<AdminCreatedUserResponse> {
  await fetchCsrfCookie();
  const res = await apiClient.post("/admin/users", input);
  return parseApiDataResponse(adminCreatedUserResponseSchema, res);
}
