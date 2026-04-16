import { Skeleton } from "@/shared/ui/skeleton";

export function NoteSeedListSkeleton() {
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="border rounded-xl p-4 space-y-3"
          aria-hidden
        >
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </li>
      ))}
    </ul>
  );
}
