"use client";

import { useEffect, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { GripVertical, Layers } from "lucide-react";
import { toast } from "sonner";
import { useUpdateDeckTree } from "../api/deck-queries";
import type { Deck } from "@/entities/deck/types";
import { haptic } from "@/shared/lib/haptics";

interface DeckSortableListProps {
  decks: Deck[];
}

export function DeckSortableList({ decks }: DeckSortableListProps) {
  const [items, setItems] = useState<Deck[]>(decks);
  const reorderMutation = useUpdateDeckTree();

  // 親から新しい配列が来た場合は同期
  useEffect(() => {
    setItems(decks);
  }, [decks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      // モバイルは長押し開始でドラッグ (誤タップ防止)
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((d) => d.id === active.id);
    const newIndex = items.findIndex((d) => d.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    haptic("medium");

    try {
      // 暫定: 階層は維持し、display_order のみ更新 (ツリー DnD は後続タスクで)
      await reorderMutation.mutateAsync(
        next.map((d, idx) => ({
          id: d.id,
          parent_id: d.parent_id,
          display_order: idx,
        })),
      );
    } catch {
      // 失敗時は元に戻す
      setItems(items);
      haptic("warning");
      toast.error("並び順の保存に失敗しました");
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      <SortableContext items={items.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-3">
          {items.map((deck) => (
            <SortableDeckItem key={deck.id} deck={deck} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableDeckItem({ deck }: { deck: Deck }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deck.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : "auto",
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <div
        className={`group flex items-center gap-2 border rounded-xl p-2 bg-card transition-shadow ${
          isDragging ? "shadow-lg" : "hover:bg-muted/50"
        }`}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`${deck.name} を並び替え`}
          className="
            shrink-0 size-11 flex items-center justify-center text-muted-foreground
            cursor-grab active:cursor-grabbing touch-none
            rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          "
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
        <Link
          href={`/decks/${deck.id}`}
          className="flex-1 flex items-center gap-3 min-h-11 px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
        >
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0"
          >
            <Layers className="size-4" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-medium truncate">{deck.name}</span>
            {deck.description && (
              <span className="block text-xs text-muted-foreground truncate">
                {deck.description}
              </span>
            )}
          </span>
        </Link>
      </div>
    </li>
  );
}
