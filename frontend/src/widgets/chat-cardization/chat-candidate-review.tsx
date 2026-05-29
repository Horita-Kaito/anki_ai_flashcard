"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { NoteSeed } from "@/entities/note-seed/types";
import {
  CandidateCard,
  useCandidatesForNote,
  useGenerationStatus,
} from "@/features/ai-candidate";

interface ChatCandidateReviewProps {
  notes: NoteSeed[];
}

export function ChatCandidateReview({ notes }: ChatCandidateReviewProps) {
  if (notes.length === 0) return null;

  return (
    <section className="space-y-4 rounded-lg border bg-background p-4 md:p-5">
      <header className="space-y-1">
        <h2 className="text-base font-semibold">チャットから作ったカード候補</h2>
        <p className="text-sm text-muted-foreground">
          複数のメモに分割された場合も、この画面で続けて確認できます。
        </p>
      </header>
      <div className="space-y-5">
        {notes.map((note) => (
          <NoteCandidateSection key={note.id} note={note} />
        ))}
      </div>
    </section>
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
          className="min-h-11 rounded-md border px-3 py-2 text-sm hover:bg-muted"
        >
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
        <div className="space-y-3">
          {pending.map((candidate, index) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              ordinal={index + 1}
              total={pending.length}
            />
          ))}
        </div>
      )}
    </section>
  );
}
