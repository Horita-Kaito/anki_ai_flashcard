"use client";

import { useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import type {
  Control,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { useWatch } from "react-hook-form";
import { useSpeechInput } from "./use-speech-input";
import type { CreateNoteSeedInput } from "../schemas/note-seed-schemas";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { MarkdownText } from "@/shared/ui/markdown-text";

type BodyTab = "edit" | "preview";

const BODY_PLACEHOLDER =
  "例: TCPの3ウェイハンドシェイクは SYN → SYN/ACK → ACK の順\n\n読んだこと・聞いたこと・覚えておきたいことを、自分の言葉で書きます。";

interface NoteSeedBodyFieldProps {
  register: UseFormRegister<CreateNoteSeedInput>;
  control: Control<CreateNoteSeedInput>;
  getValues: UseFormGetValues<CreateNoteSeedInput>;
  setValue: UseFormSetValue<CreateNoteSeedInput>;
  errorMessage?: string;
  autoFocus?: boolean;
}

/**
 * メモ本文フィールド。
 * 画面の主役として大きな textarea を提供し、編集/プレビューのタブ切替と
 * 音声入力 (対応ブラウザのみ) を備える。
 */
export function NoteSeedBodyField({
  register,
  control,
  getValues,
  setValue,
  errorMessage,
  autoFocus = false,
}: NoteSeedBodyFieldProps) {
  const [bodyTab, setBodyTab] = useState<BodyTab>("edit");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const bodyValue = useWatch({ control, name: "body" });

  const { ref: bodyRefCallback, ...bodyRegister } = register("body");
  function setBodyTextareaRef(el: HTMLTextAreaElement | null) {
    bodyRefCallback(el);
    textareaRef.current = el;
  }

  function switchBodyTab(next: BodyTab) {
    setBodyTab(next);
    if (next === "edit") {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }

  function appendRecognizedText(transcript: string) {
    const current = getValues("body") ?? "";
    const separator =
      current.trim().length === 0 || current.endsWith("\n") ? "" : "\n";
    setValue("body", `${current}${separator}${transcript}`, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setBodyTab("edit");
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  const { isSupported, isListening, toggle } = useSpeechInput({
    onResult: appendRecognizedText,
    onError: (message) => toast.error(message),
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor="body">
          メモ本文 <span className="text-destructive">*</span>
        </Label>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant={isListening ? "destructive" : "outline"}
            size="sm"
            onClick={toggle}
            disabled={!isSupported}
            aria-pressed={isListening}
            aria-label={isListening ? "音声入力を停止" : "音声入力を開始"}
            title={
              isSupported
                ? isListening
                  ? "音声入力を停止"
                  : "音声入力を開始"
                : "このブラウザは音声入力に対応していません"
            }
          >
            {isListening ? (
              <MicOff className="size-4" aria-hidden />
            ) : (
              <Mic className="size-4" aria-hidden />
            )}
            <span>{isListening ? "録音中" : "音声入力"}</span>
          </Button>
          <div
            role="tablist"
            aria-label="本文の表示モード切替"
            className="flex rounded-lg border bg-[var(--bronze-faint)] p-0.5 text-xs"
          >
            {(["edit", "preview"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                id={`body-tab-${tab}`}
                aria-selected={bodyTab === tab}
                aria-controls={`body-panel-${tab}`}
                tabIndex={bodyTab === tab ? 0 : -1}
                onClick={() => switchBodyTab(tab)}
                className={`min-h-8 rounded-md px-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  bodyTab === tab
                    ? "bg-card font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "edit" ? "編集" : "プレビュー"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        id="body-panel-edit"
        role="tabpanel"
        aria-labelledby="body-tab-edit"
        hidden={bodyTab !== "edit"}
      >
        <Textarea
          id="body"
          rows={8}
          {...bodyRegister}
          ref={setBodyTextareaRef}
          className="knowledge-text min-h-[52vh] resize-y px-4 py-4 text-lg leading-relaxed shadow-sm md:text-base"
          placeholder={BODY_PLACEHOLDER}
          aria-invalid={!!errorMessage}
          autoFocus={autoFocus}
        />
      </div>
      <div
        id="body-panel-preview"
        role="tabpanel"
        aria-labelledby="body-tab-preview"
        hidden={bodyTab !== "preview"}
        className="knowledge-text paper-rule min-h-[52vh] rounded-lg border bg-card px-4 py-4"
      >
        {bodyValue ? (
          <MarkdownText text={bodyValue} />
        ) : (
          <p className="text-sm italic text-muted-foreground">
            プレビューするメモがありません
          </p>
        )}
      </div>

      {errorMessage && (
        <p role="alert" className="text-xs text-destructive">
          {errorMessage}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Markdown 記法対応 / 音声入力は対応ブラウザのみ / PC: Cmd・Ctrl + Enter で保存
      </p>
    </div>
  );
}
