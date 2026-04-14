import { api, fetchCsrfCookie } from "@/lib/api";

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export async function register(input: RegisterInput): Promise<User> {
  await fetchCsrfCookie();
  const res = await api.post<{ data: User }>("/register", input);
  return res.data.data;
}

export async function login(input: LoginInput): Promise<User> {
  await fetchCsrfCookie();
  const res = await api.post<{ data: User }>("/login", input);
  return res.data.data;
}

export async function logout(): Promise<void> {
  await fetchCsrfCookie();
  await api.post("/logout");
}

export async function me(): Promise<User> {
  const res = await api.get<{ data: User }>("/me");
  return res.data.data;
}
