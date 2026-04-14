import Link from "next/link";
import { NotebookPen } from "lucide-react";
import type { NoteSeed } from "@/entities/note-seed/types";

interface NoteSeedListItemProps {
  note: NoteSeed;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export function NoteSeedListItem({ note }: NoteSeedListItemProps) {
  return (
    <li>
      <Link
        href={`/notes/${note.id}`}
        className="group flex items-start gap-3 border rounded-xl p-4 min-h-16 bg-card hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        aria-label={`メモ ${note.body.slice(0, 30)} を開く`}
      >
        <span
          aria-hidden
          className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0"
        >
          <NotebookPen className="size-5" />
        </span>
        <span className="flex-1 min-w-0 space-y-1">
          <span className="block text-sm line-clamp-2 break-words">
            {note.body}
          </span>
          <span className="flex gap-3 text-xs text-muted-foreground">
            <span>{formatDate(note.created_at)}</span>
            {note.subdomain && <span>#{note.subdomain}</span>}
          </span>
        </span>
      </Link>
    </li>
  );
}
