/**
 * AI 生成系エンドポイントのエラーレスポンスから、ユーザーに見せるメッセージを組み立てる。
 *
 * Backend (`bootstrap/app.php` の DomainException ハンドラ) は
 * `{ message, code? }` の JSON を返す。`code` は AiGenerationFailedException の
 * 機械可読コード (JSON_TRUNCATED / SAFETY_BLOCKED / MAX_TOKENS など)。
 */
type AxiosErrorLike = {
  response?: {
    status?: number;
    data?: {
      code?: string;
      message?: string;
    };
  };
};

/**
 * 機械可読コードからユーザー向けメッセージへのマッピング。
 * dispatch 時 (axios error) と非同期完了時 (log.error_reason) で共有する。
 */
const codeToUserMessage: Record<string, string> = {
  EMPTY_CANDIDATES:
    "AI はこのメモから候補を生成できませんでした。メモをより具体的にしたり、学習目的・サブ分野を設定してから再試行してください",
  JSON_TRUNCATED:
    "AI の出力が途中で打ち切られました。メモを分割するか、再試行してください",
  MAX_TOKENS:
    "AI の出力が長すぎて最後まで生成できませんでした。メモを分割してください",
  SAFETY_BLOCKED:
    "AI の安全フィルタにより応答がブロックされました。表現を変えて再試行してください",
  RATE_LIMITED:
    "AI の利用が一時的に制限されています。少し待ってから再試行してください",
  TIMEOUT: "AI の応答がタイムアウトしました。再試行してください",
  INVALID_RESPONSE: "AI の応答を解析できませんでした。再試行してください",
  ALREADY_IN_FLIGHT: "このメモはすでに生成中です。完了をお待ちください",
};

export function toAiErrorMessage(err: unknown, fallback: string): string {
  const e = err as AxiosErrorLike;
  const status = e.response?.status;
  const code = e.response?.data?.code;
  const serverMsg = e.response?.data?.message;

  if (status === 429) {
    return "AI の利用が一時的に制限されています。少し待ってから再試行してください";
  }

  if (code && codeToUserMessage[code]) {
    return codeToUserMessage[code];
  }

  // Backend が返した userMessage があればそれを使う
  if (typeof serverMsg === "string" && serverMsg.length > 0) {
    return serverMsg;
  }
  if (status === 502) {
    return "AI の応答解析に失敗しました。再試行してください";
  }
  return fallback;
}

/**
 * 非同期生成の log.error_reason からユーザー向けメッセージを構築する。
 * error_reason は `[CODE] technical detail` 形式で保存されている。
 */
export function toAsyncFailureMessage(errorReason: string | null | undefined): string {
  if (!errorReason) {
    return "AI 生成に失敗しました。再試行してください";
  }
  const match = errorReason.match(/^\[([A-Z_]+)\]/);
  const code = match?.[1];
  if (code && codeToUserMessage[code]) {
    return codeToUserMessage[code];
  }
  return "AI 生成に失敗しました。再試行してください";
}
