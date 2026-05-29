"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { PanelRightOpen } from "lucide-react";
import { ChatWorkspace } from "@/features/chat";
import type { MaterializeChatNotesResult } from "@/features/chat/api/endpoints";
import { useNoteSeeds } from "@/entities/note-seed/api/note-seed-queries";
import type { NoteSeed } from "@/entities/note-seed/types";
import { PageShell } from "@/shared/ui/page-shell";
import { ChatCandidateReview } from "@/widgets/chat-cardization/chat-candidate-review";
import { Button } from "@/shared/ui/button";

const CANDIDATE_NOTE_IDS_PARAM = "candidate_note_ids";
const EMPTY_NOTE_IDS: number[] = [];
let cachedSearch = "";
let cachedNoteIds: number[] = EMPTY_NOTE_IDS;

function readCandidateNoteIds(): number[] {
  if (typeof window === "undefined") return EMPTY_NOTE_IDS;
  if (window.location.search === cachedSearch) return cachedNoteIds;

  cachedSearch = window.location.search;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(CANDIDATE_NOTE_IDS_PARAM);
  if (!raw) {
    cachedNoteIds = EMPTY_NOTE_IDS;
    return cachedNoteIds;
  }

  cachedNoteIds = raw
    .split(",")
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);

  return cachedNoteIds;
}

function writeCandidateNoteIds(ids: number[]) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (ids.length === 0) {
    url.searchParams.delete(CANDIDATE_NOTE_IDS_PARAM);
  } else {
    url.searchParams.set(CANDIDATE_NOTE_IDS_PARAM, ids.join(","));
  }
  window.history.replaceState(null, "", url.toString());
}

function subscribeToLocationChange(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("popstate", onStoreChange);

  return () => window.removeEventListener("popstate", onStoreChange);
}

export function ChatPageClient() {
  const [materialized, setMaterialized] =
    useState<MaterializeChatNotesResult | null>(null);
  const [isCandidatePanelClosed, setIsCandidatePanelClosed] = useState(false);
  const candidateNoteIds = useSyncExternalStore(
    subscribeToLocationChange,
    readCandidateNoteIds,
    () => []
  );
  const noteQueries = useNoteSeeds(materialized ? [] : candidateNoteIds);

  function handleMaterialized(result: MaterializeChatNotesResult) {
    const noteIds = result.notes.map((note) => note.id);
    setMaterialized(result);
    setIsCandidatePanelClosed(false);
    writeCandidateNoteIds(noteIds);
  }

  const recoveredNotes = useMemo<NoteSeed[]>(() => {
    if (materialized) return materialized.notes;

    return noteQueries
      .map((query) => query.data)
      .filter((note): note is NoteSeed => note !== undefined);
  }, [materialized, noteQueries]);
  const hasCandidateNotes = recoveredNotes.length > 0;
  const isCandidatePanelOpen = hasCandidateNotes && !isCandidatePanelClosed;
  const isRecoveringNotes =
    !materialized &&
    candidateNoteIds.length > 0 &&
    noteQueries.some((query) => query.isLoading || query.isFetching);

  return (
    <PageShell
      title="チャット"
      description="質問から得た学びをメモ化し、カード候補生成までつなげます。"
      maxWidth="7xl"
    >
      <div
        className={
          hasCandidateNotes && isCandidatePanelOpen
            ? "grid items-start gap-4 pb-28 md:pb-0 xl:grid-cols-[minmax(0,1fr)_25rem]"
            : "pb-28 md:pb-0"
        }
      >
        <div className="space-y-3">
          <ChatWorkspace onMaterialized={handleMaterialized} />
          {hasCandidateNotes && !isCandidatePanelOpen && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="min-h-11"
                onClick={() => setIsCandidatePanelClosed(false)}
              >
                <PanelRightOpen className="size-4" aria-hidden />
                カード候補を開く
              </Button>
            </div>
          )}
          {isRecoveringNotes && (
            <p className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
              カード候補を復元しています...
            </p>
          )}
        </div>
        {hasCandidateNotes && isCandidatePanelOpen && (
          <ChatCandidateReview
            notes={recoveredNotes}
            onClose={() => setIsCandidatePanelClosed(true)}
          />
        )}
      </div>
    </PageShell>
  );
}
