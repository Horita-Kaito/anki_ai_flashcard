import { readFileSync } from "node:fs";
import { apiRequest } from "../api.js";

interface CaptureOptions {
  file?: string;
}

interface NoteSeedResponse {
  data: { id: number; body: string };
}

export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * 入力ソースの優先順位: 引数テキスト > --file > stdin
 */
export async function resolveCaptureInput(
  text: string | undefined,
  options: CaptureOptions,
  stdinReader: () => Promise<string> = readStdin
): Promise<string> {
  if (text && text.trim() !== "") {
    return text;
  }
  if (options.file) {
    return readFileSync(options.file, "utf8");
  }
  if (!process.stdin.isTTY) {
    return stdinReader();
  }
  throw new Error(
    "メモの内容を指定してください: tessera capture \"テキスト\" / --file <path> / 標準入力"
  );
}

export async function captureCommand(
  text: string | undefined,
  options: CaptureOptions
): Promise<void> {
  const body = (await resolveCaptureInput(text, options)).trim();

  if (body === "") {
    throw new Error("メモの内容が空です。");
  }
  if (body.length > 5000) {
    throw new Error(`メモは5000文字以内です (現在 ${body.length} 文字)。`);
  }

  const res = await apiRequest<NoteSeedResponse>("/note-seeds", {
    method: "POST",
    body: { body },
  });

  console.log(`メモを保存しました (id: ${res.data.id})`);
  console.log(
    "カード候補を作るには Web/iOS アプリ、または MCP 経由で生成してください。"
  );
}
