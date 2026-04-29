import type { Deck } from "@/entities/deck/types";

/**
 * Cross-feature で使われるデッキ階層ユーティリティ。
 * DnD 専用の処理は features/deck/lib/deck-tree.ts 側に残す。
 */
export interface DeckTreeNode {
  id: number;
  name: string;
  parent_id: number | null;
  depth: number;
  deck: Deck;
}

/**
 * parent_id + display_order のフラット配列から depth 付きのフラット配列を作る。
 * 深さ優先・兄弟は display_order → id の順で走査。
 */
export function flattenTree(decks: Deck[]): DeckTreeNode[] {
  const childrenByParent = new Map<number | "root", Deck[]>();
  for (const d of decks) {
    const key = d.parent_id ?? "root";
    const list = childrenByParent.get(key) ?? [];
    list.push(d);
    childrenByParent.set(key, list);
  }
  for (const list of childrenByParent.values()) {
    list.sort((a, b) => a.display_order - b.display_order || a.id - b.id);
  }

  const out: DeckTreeNode[] = [];
  const walk = (parentKey: number | "root", depth: number) => {
    const list = childrenByParent.get(parentKey) ?? [];
    for (const d of list) {
      out.push({
        id: d.id,
        name: d.name,
        parent_id: d.parent_id,
        depth,
        deck: d,
      });
      walk(d.id, depth + 1);
    }
  };
  walk("root", 0);
  return out;
}

/**
 * 親デッキ select 用の [{id, name, depth}] オプション配列を作る。
 */
export function buildHierarchicalOptions(
  decks: Deck[],
): Array<{ id: number; name: string; depth: number }> {
  return flattenTree(decks).map(({ id, name, depth }) => ({ id, name, depth }));
}

/**
 * targetDeckId が candidateId の子孫 (または自身) かを判定。循環防止に使う。
 */
export function isDescendantOrSelf(
  decks: Deck[],
  targetDeckId: number,
  candidateId: number,
): boolean {
  if (targetDeckId === candidateId) return true;

  const childrenByParent = new Map<number, number[]>();
  for (const d of decks) {
    if (d.parent_id !== null) {
      const list = childrenByParent.get(d.parent_id) ?? [];
      list.push(d.id);
      childrenByParent.set(d.parent_id, list);
    }
  }

  const stack = [targetDeckId];
  const visited = new Set<number>();
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    if (id === candidateId) return true;
    for (const childId of childrenByParent.get(id) ?? []) {
      stack.push(childId);
    }
  }
  return false;
}
