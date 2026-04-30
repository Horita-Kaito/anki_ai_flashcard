"use client";

import { useEffect, useRef } from "react";

interface UseInfiniteScrollOptions {
  /** sentinel が viewport に入ったときに呼ばれる callback。 */
  onLoadMore: () => void;
  /** false のとき observer を無効化する (次ページ無し / fetch 中など)。 */
  enabled?: boolean;
  /** sentinel から何 px 手前で発火するか (先読みマージン)。 */
  rootMargin?: string;
}

/**
 * IntersectionObserver で「リスト末尾の sentinel が見えたら次ページを fetch する」を実現する hook。
 * 戻り値の ref をリスト末尾 (空 div でよい) に渡す。
 */
export function useInfiniteScroll({
  onLoadMore,
  enabled = true,
  rootMargin = "200px",
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // 最新の callback を ref で保持し、observer 再構築のたびに付け替えなくて済むようにする。
  const callbackRef = useRef(onLoadMore);
  useEffect(() => {
    callbackRef.current = onLoadMore;
  });

  useEffect(() => {
    if (!enabled) return;
    const node = sentinelRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            callbackRef.current();
            break;
          }
        }
      },
      { rootMargin }
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return sentinelRef;
}
