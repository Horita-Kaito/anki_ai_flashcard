import { Skeleton } from "@/shared/ui/skeleton";

export function CardListSkeleton() {
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="border rounded-xl p-4 space-y-3"
          aria-hidden
        >
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}
