"use client";

import { KeyboardEvent } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/shared/ui/button";

interface ChatComposerProps {
  value: string;
  isSending: boolean;
  isCreating: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function ChatComposer({
  value,
  isSending,
  isCreating,
  onChange,
  onSubmit,
}: ChatComposerProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;

    event.preventDefault();
    onSubmit();
  }

  return (
    <div className="flex gap-2">
      <textarea
        aria-label="質問"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="質問を入力"
        rows={2}
        className="min-h-16 flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <Button
        type="submit"
        size="icon-lg"
        className="min-h-11 min-w-11 self-end"
        disabled={isSending || isCreating || value.trim() === ""}
        aria-label="送信"
      >
        {isSending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Send className="size-4" aria-hidden />
        )}
      </Button>
    </div>
  );
}
