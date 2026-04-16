"use client";

import { useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/shared/lib/utils";

/** Threshold below which we skip virtualization to avoid overhead. */
const VIRTUALIZE_THRESHOLD = 50;

interface VirtualListProps<T> {
  /** Items to render. */
  items: T[];
  /** Estimated row height in px. */
  estimateSize: number;
  /** Render function for each item. */
  renderItem: (item: T, index: number) => ReactNode;
  /** Key extractor – defaults to index. */
  getItemKey?: (item: T, index: number) => string | number;
  /** CSS class for the scrollable container. */
  className?: string;
  /** CSS class for the inner list (ul). */
  listClassName?: string;
  /** Overscan rows for smooth scrolling. */
  overscan?: number;
  /** Max height for the scroll container. Defaults to 80vh. */
  maxHeight?: string;
}

/**
 * Reusable virtualised list wrapper around @tanstack/react-virtual.
 *
 * When item count <= VIRTUALIZE_THRESHOLD (50), renders all items
 * normally to avoid virtualisation overhead for small lists.
 */
export function VirtualList<T>({
  items,
  estimateSize,
  renderItem,
  getItemKey,
  className,
  listClassName,
  overscan = 5,
  maxHeight = "80vh",
}: VirtualListProps<T>) {
  // Below threshold – plain render
  if (items.length <= VIRTUALIZE_THRESHOLD) {
    return (
      <ul className={cn(listClassName)}>
        {items.map((item, i) => (
          <div key={getItemKey ? getItemKey(item, i) : i}>{renderItem(item, i)}</div>
        ))}
      </ul>
    );
  }

  return (
    <VirtualizedInner
      items={items}
      estimateSize={estimateSize}
      renderItem={renderItem}
      getItemKey={getItemKey}
      className={className}
      listClassName={listClassName}
      overscan={overscan}
      maxHeight={maxHeight}
    />
  );
}

/**
 * Inner component that uses the virtualizer hook.
 * Extracted so the hook is only called when we actually virtualize.
 *
 * Note: The virtualized path uses absolute positioning, so grid-based
 * `listClassName` values are intentionally ignored here. Items render
 * in a single-column layout when virtualized.
 */
function VirtualizedInner<T>({
  items,
  estimateSize,
  renderItem,
  getItemKey,
  className,
  overscan,
  maxHeight,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library -- virtualizer returns unstable refs by design; this component is intentionally not memoized
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: overscan ?? 5,
  });

  return (
    <div
      ref={parentRef}
      className={cn("overflow-auto", className)}
      style={{ maxHeight }}
    >
      <ul
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          return (
            <div
              key={getItemKey ? getItemKey(item, virtualRow.index) : virtualRow.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
            >
              {renderItem(item, virtualRow.index)}
            </div>
          );
        })}
      </ul>
    </div>
  );
}
