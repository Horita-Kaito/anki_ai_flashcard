// cross-feature で参照される Card の TanStack Query キー定義。
// Mutation/Query Hook 自体は features/card/api/ に置く。
// filters は features 側の CardListFilters を含む任意のオブジェクト。

export const cardKeys = {
  all: ["cards"] as const,
  list: (filters: object = {}) =>
    [...cardKeys.all, "list", filters] as const,
  detail: (id: number) => [...cardKeys.all, "detail", id] as const,
};
