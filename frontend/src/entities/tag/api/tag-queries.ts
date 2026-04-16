import { useQuery } from "@tanstack/react-query";
import { fetchTagList } from "./endpoints";

export const tagKeys = {
  all: ["tags"] as const,
  list: () => [...tagKeys.all, "list"] as const,
};

export function useTagList() {
  return useQuery({
    queryKey: tagKeys.list(),
    queryFn: fetchTagList,
  });
}
