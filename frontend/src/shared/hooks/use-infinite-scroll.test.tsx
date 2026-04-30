import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { useInfiniteScroll } from "./use-infinite-scroll";

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;

interface MockObserver {
  callback: ObserverCallback;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  trigger: (intersecting: boolean) => void;
}

let observers: MockObserver[] = [];

beforeEach(() => {
  observers = [];
  // @ts-expect-error - mocking
  globalThis.IntersectionObserver = vi.fn().mockImplementation(function (
    this: unknown,
    cb: ObserverCallback,
  ) {
    const obs: MockObserver = {
      callback: cb,
      observe: vi.fn(),
      disconnect: vi.fn(),
      trigger: (intersecting: boolean) =>
        cb([{ isIntersecting: intersecting }]),
    };
    observers.push(obs);
    return obs;
  });
});

afterEach(() => {
  // @ts-expect-error - cleanup
  delete globalThis.IntersectionObserver;
});

function Harness({
  onLoadMore,
  enabled = true,
}: {
  onLoadMore: () => void;
  enabled?: boolean;
}) {
  const ref = useInfiniteScroll({ onLoadMore, enabled });
  return <div ref={ref} data-testid="sentinel" />;
}

describe("useInfiniteScroll", () => {
  it("sentinel が交差したら onLoadMore を呼ぶ", () => {
    const onLoadMore = vi.fn();
    render(<Harness onLoadMore={onLoadMore} />);

    expect(observers).toHaveLength(1);
    act(() => observers[0].trigger(true));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("交差していないときは callback を呼ばない", () => {
    const onLoadMore = vi.fn();
    render(<Harness onLoadMore={onLoadMore} />);

    act(() => observers[0].trigger(false));

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("enabled=false なら observer を作らない", () => {
    const onLoadMore = vi.fn();
    render(<Harness onLoadMore={onLoadMore} enabled={false} />);

    expect(observers).toHaveLength(0);
  });

  it("unmount で disconnect される", () => {
    const onLoadMore = vi.fn();
    const { unmount } = render(<Harness onLoadMore={onLoadMore} />);

    unmount();

    expect(observers[0].disconnect).toHaveBeenCalled();
  });
});
