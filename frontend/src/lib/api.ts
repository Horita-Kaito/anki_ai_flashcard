import axios, { AxiosInstance } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Sanctum SPA認証 用の axios インスタンス
 * - withCredentials: Cookie の送受信を有効化
 * - XSRF-TOKEN Cookie を axios が自動で X-XSRF-TOKEN ヘッダに付与
 */
export const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api/v1`,
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
  await axios.get(`${API_URL}/sanctum/csrf-cookie`, {
    withCredentials: true,
  });
}
