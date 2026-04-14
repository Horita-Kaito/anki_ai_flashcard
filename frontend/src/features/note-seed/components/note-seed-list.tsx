"use client";

import { useNoteSeedList } from "../api/note-seed-queries";
import { NoteSeedListItem } from "./note-seed-list-item";
import { NoteSeedListEmpty } from "./note-seed-list-empty";

export function NoteSeedList() {
  const { data, isLoading, isError, refetch } = useNoteSeedList();

  if (isLoading) {
    return (
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="h-20 border rounded-xl bg-muted/30 animate-pulse"
            aria-hidden
          />
        ))}
      </ul>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="border border-destructive/30 bg-destructive/5 rounded-xl p-4 space-y-2"
      >
        <p className="font-medium text-destructive">読み込みに失敗しました</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-sm underline underline-offset-2 min-h-11"
        >
          再試行
        </button>
      </div>
    );
  }

  const notes = data?.data ?? [];

  if (notes.length === 0) {
    return <NoteSeedListEmpty />;
  }

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
      {notes.map((note) => (
        <NoteSeedListItem key={note.id} note={note} />
      ))}
    </ul>
  );
}
