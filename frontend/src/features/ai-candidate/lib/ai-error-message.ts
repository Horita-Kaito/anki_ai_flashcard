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

export function toAiErrorMessage(err: unknown, fallback: string): string {
  const e = err as AxiosErrorLike;
  const status = e.response?.status;
  const code = e.response?.data?.code;
  const serverMsg = e.response?.data?.message;

  if (status === 429) {
    return "AI の利用が一時的に制限されています。少し待ってから再試行してください";
  }

  switch (code) {
    case "JSON_TRUNCATED":
      return "AI の出力が途中で打ち切られました。メモを分割するか、再試行してください";
    case "MAX_TOKENS":
      return "AI の出力が長すぎて最後まで生成できませんでした。メモを分割してください";
    case "SAFETY_BLOCKED":
      return "AI の安全フィルタにより応答がブロックされました。表現を変えて再試行してください";
    case "RATE_LIMITED":
      return "AI の利用が一時的に制限されています。少し待ってから再試行してください";
    case "TIMEOUT":
      return "AI の応答がタイムアウトしました。再試行してください";
    case "INVALID_RESPONSE":
      return "AI の応答を解析できませんでした。再試行してください";
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
