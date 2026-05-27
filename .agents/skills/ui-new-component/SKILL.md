---
name: ui-new-component
description: |
  **必ず使用する条件**: frontend/src/features/<feature>/components/ や frontend/src/widgets/ や frontend/src/shared/ui/ 配下に新しい .tsx コンポーネントファイルを作成するすべてのタスク。ユーザーが「DeckList コンポーネント作って」「この画面にボタン追加して」等と指示し、新規ファイル作成が必要な場合、書き始める前にこの skill を必ず起動すること。
  やること: 責務分類 (表示/コンテナ/フォーム/レイアウト) を判定し、モバイル/PC 両対応 (44px タップターゲット、focus-visible、hover、safe-area)、a11y、Props 型、状態管理方針を埋め込んだ雛形を作る。
  使わない場合: 既存コンポーネントの小規模修正、文言変更、スタイル微調整のみの場合は skill 不要。
  必ず docs/05_frontend_design.md と docs/07_testing_strategy.md に従うこと。container/form 系コンポーネントには Vitest + Testing Library の .test.tsx を同時に scaffold する (renderWithProviders を使用)。
---

# UI New Component Skill

feature 内に新しいコンポーネントを追加するワークフロー。

## 前提ドキュメント
- `docs/05_frontend_design.md`
  - 1-3 (マルチデバイス対応)
  - 4 (コンポーネント設計ルール)
  - 6-3 (レスポンシブ)

## 引数
`<feature> <component-name>`
- `<feature>`: 既存の feature 名 (kebab-case)
- `<component-name>`: kebab-case のコンポーネント名 (例: `deck-list`, `deck-form-dialog`)

## 手順

### 1. 配置先決定
`frontend/src/features/<feature>/components/<component-name>.tsx`

### 2. 分類を特定 (責務は1つ)
| 分類 | 命名例 | 特徴 |
|------|--------|------|
| 表示 | `deck-list-item`, `deck-card` | props を受け取って描画のみ |
| コンテナ | `deck-list` | TanStack Query hook + 下位コンポーネント |
| フォーム | `deck-form`, `deck-form-dialog` | react-hook-form + zod |
| レイアウト | `deck-layout` | 子要素の配置 |

### 3. 雛形 (コンテナ + 表示 の分離パターン)

**container**:
```tsx
"use client";

import { use<Feature>List } from "../api/<feature>-queries";
import { <Component>Item } from "./<component>-item";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";

export function <Component>() {
  const { data, isLoading, error } = use<Feature>List();

  if (isLoading) return <div className="p-4 text-muted-foreground">読み込み中...</div>;
  if (error) return <ErrorState error={error} />;
  if (!data?.length) return <EmptyState />;

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 p-4">
      {data.map((item) => (
        <<Component>Item key={item.id} item={item} />
      ))}
    </ul>
  );
}
```

**表示コンポーネント**:
```tsx
interface <Component>ItemProps {
  item: <Feature>;
  onSelect?: (id: number) => void;
}

export function <Component>Item({ item, onSelect }: <Component>ItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(item.id)}
      className="w-full text-left border rounded-xl p-4 min-h-11 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring transition-colors"
    >
      {/* ... */}
    </button>
  );
}
```

### 4. モバイル/PC 両対応チェック
必ず確認:
- [ ] タップターゲット 44×44px 以上 (`min-h-11` or `h-12`)
- [ ] モバイル (1カラム) → `md:` 以上でマルチカラム
- [ ] `focus-visible:ring-*` でキーボードフォーカスが見える
- [ ] `hover:` 状態がある (デスクトップフィードバック)
- [ ] `aria-*` 属性が shadcn/ui パターンに沿う
- [ ] ドラッグ&ドロップが必要なら `@dnd-kit` を使う
- [ ] キーボードショートカットが必要なら `useKeyboardShortcut` を使う (shared/hooks)

### 5. Props 設計
- `interface <Name>Props` を必ず定義
- 任意 prop は `?`、default は destructuring で
- `any` / `unknown` を使わない
- handler は `onXxx`、実装は `handleXxx`

### 6. export 方針
named export を使う:
```ts
export function <Component>() { ... }
```

必要に応じて feature の `index.ts` に re-export を追加 (外部から使う場合のみ)。

### 7. チェック
- `npx tsc --noEmit`
- `npm run lint`
- モバイル (375px) と デスクトップ (1280px) 幅で崩れないか目視確認

## NG 例
- Server Component で `useState` を使う
- `"use client"` をファイルの先頭以外に置く
- 200 行を超える肥大化 (分割する)
- `any` を props に使う
- `100vh` / `h-screen` (代わりに `min-h-dvh`)
- `className="h-8"` のタップターゲット (44px未満)
- タップターゲットに `focus:` のみで `focus-visible:` がない
