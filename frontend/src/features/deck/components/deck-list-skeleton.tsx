import { Skeleton } from "@/shared/ui/skeleton";

export function DeckListSkeleton() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-3 border rounded-xl p-4"
          aria-hidden
        >
          <Skeleton className="size-5 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/5" />
          </div>
          <Skeleton className="h-6 w-12 rounded-full" />
        </li>
      ))}
    </ul>
  );
}
