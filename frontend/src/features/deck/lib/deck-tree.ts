import type { Deck } from "@/entities/deck/types";

/**
 * parent_id + display_order のフラット配列から depth 付きのフラット配列を作る。
 * 深さ優先・兄弟は display_order → id の順で走査。
 */
export interface DeckTreeNode {
  id: number;
  name: string;
  parent_id: number | null;
  depth: number;
  deck: Deck;
}

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

// ============================================================
// Sortable Tree (DnD) utilities
// ============================================================

/**
 * DnD 用のフラット化済みアイテム。SortableContext に渡す順序を表す。
 */
export interface FlattenedDeck extends DeckTreeNode {
  /** 自身を子としてこの ID の下に入れる (親)、null ならルート */
  parentId: number | null;
  /** 折りたたまれた状態なら true (子孫非表示) */
  collapsed?: boolean;
}

/**
 * collapsed (= 折りたたまれた親の子孫) を除外してフラット配列を返す。
 */
export function flattenForDnd(
  decks: Deck[],
  collapsedIds: Set<number>,
): FlattenedDeck[] {
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

  const out: FlattenedDeck[] = [];
  const walk = (parentKey: number | "root", depth: number) => {
    const list = childrenByParent.get(parentKey) ?? [];
    for (const d of list) {
      const collapsed = collapsedIds.has(d.id);
      out.push({
        id: d.id,
        name: d.name,
        parent_id: d.parent_id,
        parentId: d.parent_id,
        depth,
        deck: d,
        collapsed,
      });
      if (!collapsed) {
        walk(d.id, depth + 1);
      }
    }
  };
  walk("root", 0);
  return out;
}

/**
 * ドラッグ中の offsetLeft から drop 先の親 / depth を推定する。
 * dnd-kit 公式 Sortable Tree example のアルゴリズムを踏襲。
 */
interface Projection {
  parentId: number | null;
  depth: number;
}

export function getProjection(
  items: FlattenedDeck[],
  activeId: number,
  overId: number,
  dragOffset: number,
  indentationWidth: number,
  maxDepth: number = Number.POSITIVE_INFINITY,
): Projection {
  const overItemIndex = items.findIndex(({ id }) => id === overId);
  const activeItemIndex = items.findIndex(({ id }) => id === activeId);
  const activeItem = items[activeItemIndex];
  if (!activeItem) return { parentId: null, depth: 0 };

  const newItems = arrayMoveImmutable(items, activeItemIndex, overItemIndex);
  const previousItem = newItems[overItemIndex - 1];
  const nextItem = newItems[overItemIndex + 1];

  const dragDepth = Math.round(dragOffset / indentationWidth);
  const projectedDepth = activeItem.depth + dragDepth;
  const maxDepthAllowed = previousItem ? previousItem.depth + 1 : 0;
  const minDepth = nextItem ? nextItem.depth : 0;

  let depth = projectedDepth;
  if (depth >= maxDepthAllowed) depth = maxDepthAllowed;
  else if (depth < minDepth) depth = minDepth;
  if (depth > maxDepth) depth = maxDepth;

  const parentId = findParentId(newItems, overItemIndex, depth);
  return { parentId, depth };
}

function findParentId(
  items: FlattenedDeck[],
  overIndex: number,
  depth: number,
): number | null {
  if (depth === 0 || overIndex === 0) return null;
  const previousItem = items[overIndex - 1];
  if (!previousItem) return null;
  if (depth === previousItem.depth + 1) return previousItem.id;
  if (depth > previousItem.depth) return previousItem.id;
  // 同じまたは浅い depth なら、先行する同 depth の親を探す
  const newParent = items
    .slice(0, overIndex)
    .reverse()
    .find((it) => it.depth === depth - 1);
  return newParent?.id ?? null;
}

function arrayMoveImmutable<T>(list: T[], from: number, to: number): T[] {
  const copy = list.slice();
  const [moved] = copy.splice(from, 1);
  if (moved !== undefined) copy.splice(to, 0, moved);
  return copy;
}

/**
 * ドラッグ確定後、新しい階層配列から全ノードの (parent_id, display_order) を
 * 算出する。API `POST /decks/tree` の payload として使う。
 */
export function computeTreeUpdate(
  items: FlattenedDeck[],
): Array<{ id: number; parent_id: number | null; display_order: number }> {
  const orderCounter = new Map<number | "root", number>();
  return items.map((item) => {
    const key = item.parentId ?? "root";
    const order = orderCounter.get(key) ?? 0;
    orderCounter.set(key, order + 1);
    return {
      id: item.id,
      parent_id: item.parentId,
      display_order: order,
    };
  });
}

/**
 * 指定 id の子孫も同時にドラッグで移動できるよう、items の順序を維持したまま
 * 自分の子孫 (折りたたまれていない分) を sub-tree として切り出す。
 */
export function getChildrenIds(
  items: FlattenedDeck[],
  id: number,
): number[] {
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return [];
  const baseDepth = items[index].depth;
  const children: number[] = [];
  for (let i = index + 1; i < items.length; i++) {
    if (items[i].depth > baseDepth) children.push(items[i].id);
    else break;
  }
  return children;
}
