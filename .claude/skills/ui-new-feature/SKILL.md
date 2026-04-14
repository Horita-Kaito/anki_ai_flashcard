---
name: ui-new-feature
description: Feature-Sliced 設計に従って新しい feature ディレクトリを scaffold する。機能名を引数に取り、api/components/hooks/schemas 等の標準構造を作成する。引数例: "deck", "card", "note-seed"。
---

# UI New Feature Skill

新しい feature (ドメイン機能) を作成するワークフロー。

## 前提ドキュメント
作業前に必ず `docs/05_frontend_design.md` を参照する。特に:
- 第 2 章 (ディレクトリ構成)
- 第 3 章 (命名規則)
- 第 4 章 (コンポーネント設計ルール)

## 手順

### 1. 引数の確認
引数 `<feature-name>` は **kebab-case の単数形**。例: `deck`, `card`, `note-seed`, `ai-candidate`, `domain-template`。

### 2. ディレクトリ作成
`frontend/src/features/<feature-name>/` に以下の空ファイルを作成:

```
features/<feature-name>/
├── api/
│   ├── endpoints.ts        # axios 呼び出し関数 (fetchX, createX, updateX, deleteX)
│   └── <feature>-queries.ts  # TanStack Query hooks (useXList, useX, useCreateX, ...)
├── components/
│   └── .gitkeep            # コンポーネントは ui-new-component で追加
├── hooks/
│   └── .gitkeep
├── schemas/
│   └── <feature>-schemas.ts  # zod スキーマ
├── types.ts                # feature 固有の型
├── constants.ts            # feature 固有の定数
└── index.ts                # public API (barrel export)
```

### 3. ファイル雛形

**types.ts**:
```ts
// ドメイン型は entities/<feature>/types.ts に定義する。
// ここには feature 内部で使う入力型・UI状態型のみ置く。
export type { /* re-export from entities if needed */ } from "@/entities/<feature>/types";
```

**<feature>-schemas.ts**:
```ts
import { z } from "zod";

export const create<Feature>Schema = z.object({
  // TODO: フィールド定義
});
export type Create<Feature>Input = z.infer<typeof create<Feature>Schema>;
```

**endpoints.ts**:
```ts
import { apiClient } from "@/shared/api/client";
import type { <Feature> } from "@/entities/<feature>/types";
import type { Create<Feature>Input } from "../schemas/<feature>-schemas";

export async function fetch<Feature>List(): Promise<<Feature>[]> {
  const res = await apiClient.get<{ data: <Feature>[] }>("/<features>");
  return res.data.data;
}
// 必要な CRUD を追加
```

**<feature>-queries.ts**:
```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetch<Feature>List } from "./endpoints";

export const <feature>Keys = {
  all: ["<features>"] as const,
  list: () => [...<feature>Keys.all, "list"] as const,
  detail: (id: number) => [...<feature>Keys.all, "detail", id] as const,
};

export function use<Feature>List() {
  return useQuery({
    queryKey: <feature>Keys.list(),
    queryFn: fetch<Feature>List,
  });
}
```

**index.ts**:
```ts
// feature の public API (外部から import してよい symbol のみ)
```

### 4. 対応する entity (必要なら)
ドメインモデルが新規なら `frontend/src/entities/<feature>/types.ts` に型定義も作成する。

### 5. チェック
- `npx tsc --noEmit` が通る
- 命名規則 (kebab-case ファイル、PascalCase 型) を守っている
- 他の feature から直接 import されていない

## 注意事項
- **feature 間で直接 import しない**。共通化が必要なら shared/ または entities/ に引き上げ。
- **app/ から feature の components や hooks を呼ぶのは OK**。逆は禁止。
- UI コンポーネントは `ui-new-component` skill で追加する。
