import { apiClient, fetchCsrfCookie } from "@/shared/api/client";
import type { User } from "@/entities/user/types";
import type { LoginInput } from "../schemas/auth-schemas";
import { userResponseSchema } from "@/entities/user/schemas";
import { parseApiDataResponse } from "@/shared/api/parse-response";

export { fetchCurrentUser } from "@/entities/user/api/endpoints";

export async function loginUser(input: LoginInput): Promise<User> {
  await fetchCsrfCookie();
  const res = await apiClient.post("/login", input);
  return parseApiDataResponse(userResponseSchema, res);
}

export async function logoutUser(): Promise<void> {
  await fetchCsrfCookie();
  await apiClient.post("/logout");
}
