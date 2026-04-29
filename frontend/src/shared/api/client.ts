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

const AUTH_ENDPOINTS = ["/login", "/me"];

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // セッション切れ時は次回 POST で CSRF を再取得させる
      resetCsrfCookieCache();
      if (
        !AUTH_ENDPOINTS.some((ep) => error.config?.url?.endsWith(ep)) &&
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login")
      ) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      }
    }
    if (error.response?.status === 419) {
      // CSRF token mismatch も同様にリセット
      resetCsrfCookieCache();
    }
    return Promise.reject(error);
  },
);

/**
 * Sanctum の CSRF Cookie を取得する。
 *
 * 並列 POST から複数回呼ばれても重複 GET を発生させないよう、
 * 一度取得した後は in-flight Promise を共有する。
 * 401 (= ログアウト相当) を検知したらリセットし次回再取得する。
 */
let csrfPromise: Promise<void> | null = null;

export async function fetchCsrfCookie(): Promise<void> {
  if (csrfPromise === null) {
    csrfPromise = axios
      .get(`${env.apiUrl}/sanctum/csrf-cookie`, { withCredentials: true })
      .then(() => undefined)
      .catch((err) => {
        // 失敗時は次回再試行できるようリセット
        csrfPromise = null;
        throw err;
      });
  }
  return csrfPromise;
}

/**
 * CSRF Cookie 取得状態をリセット (ログアウト時 / 401 検知時に呼ぶ)。
 */
export function resetCsrfCookieCache(): void {
  csrfPromise = null;
}
