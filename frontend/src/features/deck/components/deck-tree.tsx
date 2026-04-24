"use client";

import { useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { ChevronDown, ChevronRight, GripVertical, Layers } from "lucide-react";
import { toast } from "sonner";
import { useUpdateDeckTree } from "../api/deck-queries";
import {
  computeTreeUpdate,
  flattenForDnd,
  getChildrenIds,
  getProjection,
  type FlattenedDeck,
} from "../lib/deck-tree";
import type { Deck } from "@/entities/deck/types";
import { haptic } from "@/shared/lib/haptics";

interface DeckTreeProps {
  decks: Deck[];
}

const INDENTATION_WIDTH = 20;
/** UI 上インデントを打ち止めて `↳` マーカーに切り替える深さ */
const MAX_VISUAL_DEPTH = 5;

/**
 * デッキの階層ツリー表示 + ドラッグ&ドロップによる親変更・並び替え。
 *
 * - PC: 6px ドラッグで開始
 * - モバイル: 長押し 200ms で開始、左右動で親変更、上下動で並び替え
 * - 折りたたみボタンで子を一時的に隠せる (保存状態は持たず UI 内のみ)
 */
export function DeckTree({ decks }: DeckTreeProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  const [activeId, setActiveId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const [offsetLeft, setOffsetLeft] = useState(0);
  const updateTree = useUpdateDeckTree();

  // active の子孫は、ドラッグ中一時的に collapse してまとめて持ち運ぶ
  const flattened = useMemo(() => {
    const collapsed = new Set(collapsedIds);
    if (activeId !== null) collapsed.add(activeId);
    const raw = flattenForDnd(decks, collapsed);
    // active の子孫を除外 (自分ごと動かすため)
    if (activeId === null) return raw;
    const childIds = new Set(getChildrenIds(flattenForDnd(decks, collapsedIds), activeId));
    return raw.filter((it) => !childIds.has(it.id));
  }, [decks, collapsedIds, activeId]);

  const projected =
    activeId !== null && overId !== null
      ? getProjection(flattened, activeId, overId, offsetLeft, INDENTATION_WIDTH)
      : null;

  const sortedIds = useMemo(() => flattened.map((f) => f.id), [flattened]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(Number(active.id));
    setOverId(Number(active.id));
  }

  function handleDragMove({ delta }: DragMoveEvent) {
    setOffsetLeft(delta.x);
  }

  function handleDragOver({ over }: DragOverEvent) {
    setOverId(over ? Number(over.id) : null);
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    const activeIdNum = Number(active.id);
    resetDragState();
    if (!over || !projected) return;

    // 新しい flattened 配列を作成 (active を over 位置に移動)
    const baseList = flattenForDnd(decks, collapsedIds);
    const activeIndex = baseList.findIndex((i) => i.id === activeIdNum);
    const overIndex = baseList.findIndex((i) => i.id === Number(over.id));
    if (activeIndex === -1 || overIndex === -1) return;

    const moved: FlattenedDeck[] = baseList.slice();
    const [taken] = moved.splice(activeIndex, 1);
    if (!taken) return;
    const targetIndex = activeIndex < overIndex ? overIndex : overIndex;
    const newItem: FlattenedDeck = {
      ...taken,
      depth: projected.depth,
      parentId: projected.parentId,
      parent_id: projected.parentId,
    };
    moved.splice(targetIndex, 0, newItem);

    const payload = computeTreeUpdate(moved);
    haptic("medium");

    try {
      await updateTree.mutateAsync(payload);
    } catch {
      haptic("warning");
      toast.error("並び順の保存に失敗しました");
    }
  }

  function handleDragCancel() {
    resetDragState();
  }

  function resetDragState() {
    setActiveId(null);
    setOverId(null);
    setOffsetLeft(0);
  }

  function toggleCollapse(id: number) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const activeItem =
    activeId !== null ? flattened.find((f) => f.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
        <ul className="space-y-1.5">
          {flattened.map((item) => {
            const depth =
              item.id === activeId && projected ? projected.depth : item.depth;
            const isCollapsed = collapsedIds.has(item.id);
            const hasChildren = decks.some((d) => d.parent_id === item.id);
            return (
              <SortableTreeRow
                key={item.id}
                item={item}
                depth={depth}
                collapsed={isCollapsed}
                hasChildren={hasChildren}
                onToggleCollapse={() => toggleCollapse(item.id)}
              />
            );
          })}
        </ul>
      </SortableContext>

      <DragOverlay>
        {activeItem ? (
          <DeckTreeRow
            item={activeItem}
            depth={Math.min(activeItem.depth, MAX_VISUAL_DEPTH)}
            collapsed={false}
            hasChildren={false}
            dragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// --------------------------------------------------------------------

interface RowBaseProps {
  item: FlattenedDeck;
  depth: number;
  collapsed: boolean;
  hasChildren: boolean;
}

function SortableTreeRow({
  item,
  depth,
  collapsed,
  hasChildren,
  onToggleCollapse,
}: RowBaseProps & { onToggleCollapse: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <DeckTreeRow
        item={item}
        depth={depth}
        collapsed={collapsed}
        hasChildren={hasChildren}
        onToggleCollapse={onToggleCollapse}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </li>
  );
}

function DeckTreeRow({
  item,
  depth,
  collapsed,
  hasChildren,
  onToggleCollapse,
  dragHandleProps,
  dragging = false,
}: RowBaseProps & {
  onToggleCollapse?: () => void;
  dragHandleProps?: Record<string, unknown>;
  dragging?: boolean;
}) {
  const cappedDepth = Math.min(depth, MAX_VISUAL_DEPTH);
  const overflow = depth - cappedDepth;

  return (
    <div
      className={`group flex items-center gap-1 border rounded-xl p-1.5 bg-card transition-shadow ${
        dragging ? "shadow-lg ring-1 ring-primary/30" : "hover:bg-muted/50"
      }`}
      style={{ marginLeft: `${cappedDepth * INDENTATION_WIDTH}px` }}
    >
      <button
        type="button"
        {...(dragHandleProps ?? {})}
        aria-label={`${item.name} をドラッグで並び替え・階層移動`}
        className="
          shrink-0 size-11 flex items-center justify-center text-muted-foreground
          cursor-grab active:cursor-grabbing touch-none
          rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
        "
      >
        <GripVertical className="size-4" aria-hidden />
      </button>

      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={collapsed ? `${item.name} の子を展開` : `${item.name} を折りたたむ`}
        aria-expanded={!collapsed}
        className={`
          shrink-0 size-9 flex items-center justify-center text-muted-foreground rounded-md
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          ${hasChildren ? "hover:bg-muted" : "invisible"}
        `}
        tabIndex={hasChildren ? 0 : -1}
      >
        {collapsed ? (
          <ChevronRight className="size-4" aria-hidden />
        ) : (
          <ChevronDown className="size-4" aria-hidden />
        )}
      </button>

      <Link
        href={`/decks/${item.id}`}
        className="flex-1 flex items-center gap-2 min-h-11 px-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {overflow > 0 && (
          <span
            aria-hidden
            className="text-[10px] text-muted-foreground font-mono"
            title={`深さ ${depth + 1}`}
          >
            ↳
          </span>
        )}
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0"
        >
          <Layers className="size-4" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-medium truncate">{item.name}</span>
          {item.deck.description && (
            <span className="block text-xs text-muted-foreground truncate">
              {item.deck.description}
            </span>
          )}
        </span>
      </Link>
    </div>
  );
}
