export interface ApiToken {
  id: number;
  name: string;
  /** Sanctum abilities。["*"] = フルアクセス、["mcp:use"] = MCP 専用 */
  abilities: string[];
  last_used_at: string | null;
  created_at: string | null;
}

/** トークン発行時に一度だけ返るプレーンテキスト付きレスポンス */
export interface IssuedApiToken {
  id: number;
  name: string;
  abilities: string[];
  /** 平文トークン。再表示不可 */
  token: string;
}

export type ApiTokenScope = "full" | "mcp";
