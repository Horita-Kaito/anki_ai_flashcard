---
name: ui-new-page
description: Next.js App Router に新しいページルートを追加する。引数例: "decks" or "decks/[id]"。route group, metadata, loading/error, 認証要否を判断する。
---

# UI New Page Skill

`app/` 配下に新しいページを追加するワークフロー。

## 前提ドキュメント
- `docs/05_frontend_design.md`
  - 2 (ディレクトリ構成、route group)
  - 4-3 (Server Component vs Client Component)
  - 12 (SEO/メタデータ)

## 引数
`<path>` — ルートパス。例: `decks`, `decks/[id]`, `notes/new`。

## 手順

### 1. route group を決定

| パス種別 | 配置 | 認証 | 例 |
|---------|------|------|-----|
| LP・静的ページ | `app/(public)/<path>/` | 不要 | `/`, `/pricing`, `/terms` |
| 認証フロー | `app/(auth)/<path>/` | 不要 | `/login`, `/register`, `/forgot-password` |
| アプリ本体 | `app/(app)/<path>/` | 必要 (middleware) | `/dashboard`, `/decks`, `/notes` |

### 2. ファイル構成
最小:
```
app/(app)/<path>/page.tsx
```

必要に応じて:
```
app/(app)/<path>/
├── page.tsx
├── layout.tsx     # サブレイアウトが必要な場合
├── loading.tsx    # Suspense フォールバック
├── error.tsx      # エラー境界
└── not-found.tsx  # 404
```

### 3. page.tsx 雛形

**Server Component (デフォルト、推奨)**:
```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "<Page Title> | Anki AI Flashcard",
};

export default function <Name>Page() {
  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold">タイトル</h1>
        {/* feature の container component を配置 */}
        <<FeatureContainer />
      </div>
    </main>
  );
}
```

**Client Component が必要な場合** (useState, hooks 等):
```tsx
"use client";

import { useX } from "@/features/<feature>";

export default function <Name>Page() {
  // ...
}
```

### 4. 設計原則
- **page.tsx にビジネスロジックを書かない** — feature の container component を組み立てるだけに留める
- **データ取得は Client Component の TanStack Query で行う** (MVP 段階)
- **認証済みページは `useCurrentUser()` で認証状態を確認** (middleware は補助、最終確認はUI側)
- **Mobile: 1カラム、PC: `md:` 以上でマルチカラム** のベースレイアウト

### 5. ナビゲーション追加
必要に応じて `widgets/app-shell/bottom-tab-bar.tsx` と `desktop-sidebar.tsx` にリンクを追加する。主要画面のみ。

### 6. middleware 更新
`(app)` 配下に新しいトップレベルパスを追加する場合、`frontend/src/middleware.ts` の `matcher` 配列に追記:
```ts
matcher: [
  "/dashboard/:path*",
  "/decks/:path*",
  // ← 新しいパスを追加
],
```

### 7. metadata を必ず設定
公開ルート (`(public)`, `(auth)`) では SEO のため詳細な metadata を:
```tsx
export const metadata: Metadata = {
  title: "Page Title",
  description: "Page description",
  openGraph: {
    title: "...",
    description: "...",
  },
};
```

認証ページ (`(app)`) では `title` のみで十分。

### 8. チェック
- `npx tsc --noEmit`
- `npm run lint`
- middleware の matcher に追加されているか (認証ページの場合)
- モバイル/PC 両方で動作確認
