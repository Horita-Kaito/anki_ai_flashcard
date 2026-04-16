import { useQuery } from "@tanstack/react-query";
import { fetchNoteSeed } from "./endpoints";

export const noteSeedKeys = {
  all: ["note-seeds"] as const,
  detail: (id: number) => [...noteSeedKeys.all, "detail", id] as const,
};

export function useNoteSeed(id: number) {
  return useQuery({
    queryKey: noteSeedKeys.detail(id),
    queryFn: () => fetchNoteSeed(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}
