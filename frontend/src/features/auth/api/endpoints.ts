import { apiClient, fetchCsrfCookie } from "@/shared/api/client";
import type { User } from "@/entities/user/types";
import type { LoginInput, RegisterInput } from "../schemas/auth-schemas";

export async function registerUser(input: RegisterInput): Promise<User> {
  await fetchCsrfCookie();
  const res = await apiClient.post<{ data: User }>("/register", input);
  return res.data.data;
}

export async function loginUser(input: LoginInput): Promise<User> {
  await fetchCsrfCookie();
  const res = await apiClient.post<{ data: User }>("/login", input);
  return res.data.data;
}

export async function logoutUser(): Promise<void> {
  await fetchCsrfCookie();
  await apiClient.post("/logout");
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await apiClient.get<{ data: User }>("/me");
  return res.data.data;
}
