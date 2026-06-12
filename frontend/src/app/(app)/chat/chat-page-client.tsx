"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { History, Loader2, PanelRightOpen } from "lucide-react";
import { ChatWorkspace } from "@/features/chat";
import type { MaterializeChatNotesResult } from "@/features/chat/api/endpoints";
import {
  useChatCardizationBatch,
  useChatCardizationBatches,
} from "@/features/chat/api/chat-queries";
import { useNoteSeeds } from "@/entities/note-seed/api/note-seed-queries";
import type { NoteSeed } from "@/entities/note-seed/types";
import { ChatCandidateReview } from "@/widgets/chat-cardization/chat-candidate-review";
import { Button } from "@/shared/ui/button";

const CANDIDATE_NOTE_IDS_PARAM = "candidate_note_ids";
const CARDIZATION_BATCH_ID_PARAM = "cardization_batch_id";
const EMPTY_NOTE_IDS: number[] = [];
let cachedSearch = "";
let cachedNoteIds: number[] = EMPTY_NOTE_IDS;
let cachedBatchSearch = "";
let cachedBatchId: number | null = null;

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

function readCardizationBatchId(): number | null {
  if (typeof window === "undefined") return null;
  if (window.location.search === cachedBatchSearch) return cachedBatchId;

  cachedBatchSearch = window.location.search;
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get(CARDIZATION_BATCH_ID_PARAM));
  cachedBatchId = Number.isInteger(id) && id > 0 ? id : null;

  return cachedBatchId;
}

function writeCardizationState(batchId: number | null, noteIds: number[] = []) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (batchId === null) {
    url.searchParams.delete(CARDIZATION_BATCH_ID_PARAM);
  } else {
    url.searchParams.set(CARDIZATION_BATCH_ID_PARAM, String(batchId));
  }
  if (noteIds.length === 0 || batchId !== null) {
    url.searchParams.delete(CANDIDATE_NOTE_IDS_PARAM);
  } else {
    url.searchParams.set(CANDIDATE_NOTE_IDS_PARAM, noteIds.join(","));
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
  const [openedBatchId, setOpenedBatchId] = useState<number | null>(null);
  const candidateNoteIds = useSyncExternalStore(
    subscribeToLocationChange,
    readCandidateNoteIds,
    () => []
  );
  const urlBatchId = useSyncExternalStore(
    subscribeToLocationChange,
    readCardizationBatchId,
    () => null
  );
  const selectedBatchId = openedBatchId ?? urlBatchId;
  const batchesQuery = useChatCardizationBatches();
  const batchQuery = useChatCardizationBatch(materialized ? null : selectedBatchId);
  const noteQueries = useNoteSeeds(
    materialized || selectedBatchId !== null ? [] : candidateNoteIds
  );

  function handleMaterialized(result: MaterializeChatNotesResult) {
    setMaterialized(result);
    setOpenedBatchId(result.batch.id);
    setIsCandidatePanelClosed(false);
    writeCardizationState(result.batch.id);
  }

  function handleOpenBatch(batchId: number) {
    setMaterialized(null);
    setOpenedBatchId(batchId);
    setIsCandidatePanelClosed(false);
    writeCardizationState(batchId);
  }

  const recoveredNotes = useMemo<NoteSeed[]>(() => {
    if (materialized) return materialized.notes;
    if (batchQuery.data) return batchQuery.data.notes;

    return noteQueries
      .map((query) => query.data)
      .filter((note): note is NoteSeed => note !== undefined);
  }, [batchQuery.data, materialized, noteQueries]);
  const hasCandidateNotes = recoveredNotes.length > 0;
  const isCandidatePanelOpen = hasCandidateNotes && !isCandidatePanelClosed;
  const isRecoveringNotes =
    !materialized &&
    ((selectedBatchId !== null && (batchQuery.isLoading || batchQuery.isFetching)) ||
      (selectedBatchId === null &&
        candidateNoteIds.length > 0 &&
        noteQueries.some((query) => query.isLoading || query.isFetching)));
  const recentBatches = batchesQuery.data?.data ?? [];
  const recentCardizationHistory =
    recentBatches.length > 0 ? (
      <section className="rounded-lg p-1.5">
        <div className="flex items-center gap-2 px-2 py-2 text-xs font-medium text-muted-foreground">
          <History className="size-3.5" aria-hidden />
          最近のカード化
        </div>
        <ul className="space-y-1">
          {recentBatches.map((batch) => (
            <li key={batch.id}>
              <Button
                type="button"
                variant={selectedBatchId === batch.id ? "secondary" : "ghost"}
                size="sm"
                className="min-h-11 w-full justify-start gap-2 px-3 text-left"
                onClick={() => handleOpenBatch(batch.id)}
              >
                <span className="min-w-0 flex-1 truncate">
                  {batch.source_chat_session_title ?? `Batch #${batch.id}`}
                </span>
                <span className="shrink-0 text-xs opacity-70">{batch.notes_count}件</span>
              </Button>
            </li>
          ))}
        </ul>
      </section>
    ) : null;

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2 md:h-full md:px-0 md:py-0">
      <div
        className={
          hasCandidateNotes && isCandidatePanelOpen
            ? "grid min-h-0 flex-1 items-stretch gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_25rem]"
            : "min-h-0 flex-1 overflow-hidden"
        }
      >
        <div className="min-h-0 overflow-hidden">
          <ChatWorkspace
            onMaterialized={handleMaterialized}
            sidebarFooter={recentCardizationHistory}
          />
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
            <p className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              カード候補を復元しています...
            </p>
          )}
        </div>
        {hasCandidateNotes && isCandidatePanelOpen && (
          <div className="min-h-0 overflow-y-auto">
            <ChatCandidateReview
              notes={recoveredNotes}
              onClose={() => setIsCandidatePanelClosed(true)}
            />
          </div>
        )}
      </div>
    </main>
  );
}
