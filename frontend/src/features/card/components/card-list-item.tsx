import Link from "next/link";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { CARD_TYPE_LABELS } from "@/entities/card/types";
import type { Card } from "@/entities/card/types";
import { useArchiveCard, useUnarchiveCard } from "../api/card-queries";
import { extractClozeAnswers, stripClozeMarkers } from "@/shared/utils/cloze";
import { SchedulerBadge } from "@/shared/ui/scheduler-badge";

interface CardListItemProps {
  card: Card;
}

export function CardListItem({ card }: CardListItemProps) {
  const archiveMutation = useArchiveCard();
  const unarchiveMutation = useUnarchiveCard();
  const isArchived = card.is_archived ?? false;
  const isPending = archiveMutation.isPending || unarchiveMutation.isPending;

  const isCloze = card.card_type === "cloze_like";
  const questionPreview = isCloze
    ? stripClozeMarkers(card.question)
    : card.question;
  const clozeAnswers = isCloze ? extractClozeAnswers(card.question) : [];
  const answerPreview =
    isCloze && clozeAnswers.length > 0
      ? clozeAnswers.join("、")
      : card.answer;

  function handleToggleArchive(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isPending) return;

    if (isArchived) {
      unarchiveMutation.mutate(card.id, {
        onSuccess: () => toast.success("アーカイブを解除しました"),
        onError: () => toast.error("アーカイブ解除に失敗しました"),
      });
    } else {
      archiveMutation.mutate(card.id, {
        onSuccess: () => toast.success("アーカイブしました"),
        onError: () => toast.error("アーカイブに失敗しました"),
      });
    }
  }

  return (
    <li>
      <Link
        href={`/cards/${card.id}`}
        className="group flex flex-col gap-2 border rounded-xl p-4 min-h-16 bg-card hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm line-clamp-2 flex-1">{questionPreview}</p>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleToggleArchive}
              disabled={isPending}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50"
              aria-label={isArchived ? "アーカイブ解除" : "アーカイブ"}
              title={isArchived ? "アーカイブ解除" : "アーカイブ"}
            >
              {isArchived ? (
                <ArchiveRestore className="size-4" aria-hidden />
              ) : (
                <Archive className="size-4" aria-hidden />
              )}
            </button>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {CARD_TYPE_LABELS[card.card_type]}
            </span>
            <SchedulerBadge scheduler={card.scheduler} size="xs" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {answerPreview}
        </p>
        {card.tags && card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.tags.map((t) => (
              <span
                key={t.id}
                className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
              >
                {t.name}
              </span>
            ))}
          </div>
        )}
      </Link>
    </li>
  );
}
