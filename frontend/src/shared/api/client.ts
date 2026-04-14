import axios, { AxiosInstance } from "axios";
import { env } from "@/shared/config/env";

/**
 * Sanctum SPA認証 用の axios インスタンス
 * - withCredentials: Cookie の送受信を有効化
 * - withXSRFToken: XSRF-TOKEN Cookie を自動で X-XSRF-TOKEN ヘッダに付与
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: `${env.apiUrl}/api/v1`,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

/**
 * Sanctum の CSRF Cookie を取得
 * ログイン・登録・ログアウトなどの POST 前に必ず呼ぶ
 */
export async function fetchCsrfCookie(): Promise<void> {
  await axios.get(`${env.apiUrl}/sanctum/csrf-cookie`, {
    withCredentials: true,
  });
}
