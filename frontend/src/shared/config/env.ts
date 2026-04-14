/**
 * 環境変数の集約点
 * NEXT_PUBLIC_* のみクライアントで参照可能
 */
export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
} as const;
