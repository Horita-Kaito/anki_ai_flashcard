import axios, { AxiosInstance } from "axios";
import { env } from "@/shared/config/env";

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${env.apiUrl}/api/v1`,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

const AUTH_ENDPOINTS = ["/login", "/register", "/me"];

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !AUTH_ENDPOINTS.some((ep) => error.config?.url?.endsWith(ep)) &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
    return Promise.reject(error);
  },
);

/**
 * Sanctum の CSRF Cookie を取得
 * ログイン・登録・ログアウトなどの POST 前に必ず呼ぶ
 */
export async function fetchCsrfCookie(): Promise<void> {
  await axios.get(`${env.apiUrl}/sanctum/csrf-cookie`, {
    withCredentials: true,
  });
}
