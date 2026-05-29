"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ExternalLink, Loader2, X } from "lucide-react";
import type { NoteSeed } from "@/entities/note-seed/types";
import {
  CandidateReviewList,
  useCandidatesForNote,
  useGenerationStatus,
} from "@/features/ai-candidate";
import { Button } from "@/shared/ui/button";

interface ChatCandidateReviewProps {
  notes: NoteSeed[];
  onClose?: () => void;
}

export function ChatCandidateReview({ notes, onClose }: ChatCandidateReviewProps) {
  if (notes.length === 0) return null;

  return (
    <aside
      className="side-panel-enter rounded-lg border bg-background shadow-sm xl:sticky xl:top-6 xl:max-h-[calc(100dvh-7rem)] xl:overflow-hidden"
      aria-label="チャットから作ったカード候補"
    >
      <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-base font-semibold">カード候補</h2>
          <p className="text-sm text-muted-foreground">
            チャットから作ったメモをまとめて確認できます。
          </p>
        </div>
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="min-h-11 min-w-11 shrink-0"
            onClick={onClose}
            aria-label="カード候補パネルを閉じる"
          >
            <X className="size-4" aria-hidden />
          </Button>
        )}
      </header>
      <div className="space-y-5 p-4 xl:max-h-[calc(100dvh-12rem)] xl:overflow-y-auto">
        {notes.map((note) => (
          <NoteCandidateSection key={note.id} note={note} />
        ))}
      </div>
    </aside>
  );
}

interface NoteCandidateSectionProps {
  note: NoteSeed;
}

function NoteCandidateSection({ note }: NoteCandidateSectionProps) {
  const { data: generationStatus } = useGenerationStatus(note.id);
  const isInFlight =
    generationStatus?.status === "queued" ||
    generationStatus?.status === "processing";
  const {
    data: candidates,
    isLoading,
    refetch: refetchCandidates,
  } = useCandidatesForNote(note.id, undefined, {
    refetchInterval: isInFlight ? 3000 : false,
  });

  useEffect(() => {
    if (
      generationStatus?.status === "success" ||
      generationStatus?.status === "partial_success"
    ) {
      void refetchCandidates();
    }
  }, [generationStatus?.status, refetchCandidates]);

  const pending = candidates?.filter((candidate) => candidate.status === "pending") ?? [];
  const failed = generationStatus?.status === "failed";

  return (
    <section className="space-y-3 border-t pt-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">メモ #{note.id}</h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">{note.body}</p>
        </div>
        <Link
          href={`/notes/${note.id}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ExternalLink className="size-4" aria-hidden />
          メモを開く
        </Link>
      </div>
      {isLoading || isInFlight ? (
        <div className="flex min-h-24 items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          候補生成を待っています...
        </div>
      ) : failed ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          候補生成に失敗しました。メモ詳細から再生成できます。
        </p>
      ) : pending.length === 0 ? (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          レビュー待ち候補はありません。
        </p>
      ) : (
        <CandidateReviewList
          candidates={pending}
          idPrefix={`chat-note-${note.id}-candidates`}
          showHistory={false}
        />
      )}
    </section>
  );
}
