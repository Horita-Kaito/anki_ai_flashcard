"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface BackHeaderProps {
  title: string;
}

export function BackHeader({ title }: BackHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-1 md:hidden">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center justify-center size-11 -ml-2 rounded-md hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="戻る"
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <h1 className="text-lg font-semibold truncate">{title}</h1>
    </div>
  );
}
