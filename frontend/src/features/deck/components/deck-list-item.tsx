import Link from "next/link";
import { Layers } from "lucide-react";
import type { Deck } from "@/entities/deck/types";

interface DeckListItemProps {
  deck: Deck;
}

export function DeckListItem({ deck }: DeckListItemProps) {
  return (
    <li>
      <Link
        href={`/decks/${deck.id}`}
        className="group flex items-center gap-3 border rounded-xl p-4 min-h-16 bg-card hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        aria-label={`デッキ ${deck.name} を開く`}
      >
        <span
          aria-hidden
          className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0"
        >
          <Layers className="size-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-medium truncate">{deck.name}</span>
          {deck.description && (
            <span className="block text-sm text-muted-foreground truncate">
              {deck.description}
            </span>
          )}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">
          上限 {deck.new_cards_limit}/日
        </span>
      </Link>
    </li>
  );
}
