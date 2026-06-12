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
    <div className="relative flex items-end rounded-2xl border bg-background shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/20">
      <textarea
        aria-label="質問"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="質問を入力..."
        rows={2}
        className="min-h-[60px] w-full resize-none border-0 bg-transparent py-4.5 pl-4 pr-14 text-sm outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <Button
        type="submit"
        size="icon"
        className="absolute right-2.5 bottom-2.5 size-10 rounded-full shrink-0"
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
