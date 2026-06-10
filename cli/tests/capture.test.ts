import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveCaptureInput } from "../src/commands/capture.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "tessera-cli-test-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("resolveCaptureInput", () => {
  it("引数テキストが最優先される", async () => {
    const file = join(dir, "note.md");
    writeFileSync(file, "ファイルの内容");

    const result = await resolveCaptureInput("引数の内容", { file });

    expect(result).toBe("引数の内容");
  });

  it("引数がなければ --file を読む", async () => {
    const file = join(dir, "note.md");
    writeFileSync(file, "ファイルの内容");

    const result = await resolveCaptureInput(undefined, { file });

    expect(result).toBe("ファイルの内容");
  });

  it("TTY でなければ stdin から読む", async () => {
    const original = process.stdin.isTTY;
    Object.defineProperty(process.stdin, "isTTY", {
      value: false,
      configurable: true,
    });

    try {
      const result = await resolveCaptureInput(undefined, {}, async () => "stdinの内容");
      expect(result).toBe("stdinの内容");
    } finally {
      Object.defineProperty(process.stdin, "isTTY", {
        value: original,
        configurable: true,
      });
    }
  });
});
