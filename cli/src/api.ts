import { loadConfig } from "./config.js";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** login など、トークン不要のエンドポイント用 */
  auth?: boolean;
}

/**
 * Tessera REST API の薄いクライアント。
 * エラーはユーザー向けの対処ヒント付きメッセージに変換する。
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { apiUrl, token } = loadConfig();
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (auth) {
    if (!token) {
      throw new ApiError(
        "ログインしていません。`tessera login` を実行してください。",
        401
      );
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${apiUrl}/api/v1${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `APIエラー (${res.status})`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data.message) message = data.message;
    } catch {
      // JSON でないエラーレスポンスはステータスコードのみ表示
    }

    if (res.status === 401) {
      message = `${message}\nトークンが無効です。\`tessera login\` で再ログインしてください。`;
    } else if (res.status === 403) {
      message = `${message}\nこのトークンのスコープでは実行できません。\`tessera login --scope full\` で再発行してください。`;
    } else if (res.status === 429) {
      message = `${message}\nレート制限に達しました。しばらく待って再試行してください。`;
    }

    throw new ApiError(message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}
