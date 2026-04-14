import Link from "next/link";
import { CARD_TYPE_LABELS } from "@/entities/card/types";
import type { Card } from "@/entities/card/types";

interface CardListItemProps {
  card: Card;
}

export function CardListItem({ card }: CardListItemProps) {
  return (
    <li>
      <Link
        href={`/cards/${card.id}`}
        className="group flex flex-col gap-2 border rounded-xl p-4 min-h-16 bg-card hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm line-clamp-2 flex-1">{card.question}</p>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
            {CARD_TYPE_LABELS[card.card_type]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {card.answer}
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
