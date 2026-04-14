# フロントエンド設計書

本書は Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui で構築されるフロントエンドの、**アーキテクチャ・命名規則・ワークフロー**を厳密に定義する。

> 前提: 個人利用から開始し、**将来的に公式リリース・収益化**を行う。初期からそれに耐える設計・命名を敷く。

---

## 1. 設計思想

### 1-1. 基本原則
1. **責務の分離** — 1ファイル1責務、1コンポーネント1関心事。
2. **Feature-Sliced 指向** — 機能 (feature) 単位で凝集させ、横断的な部品のみ `shared/` に置く。
3. **Server 状態と Client 状態の明確な分離** — サーバー状態は TanStack Query、ローカル UI は useState、フォームは react-hook-form。
4. **Props Drilling を避ける、Context を濫用しない** — feature 内で完結する状態は feature 内の hook で保持。
5. **shadcn/ui は改造しない、拡張する** — `shared/ui/` 直下に置き、独自拡張は `shared/ui/x-*` 命名でラップする。

### 1-2. 収益化・公式リリースを見据えた追加原則
- **i18n 可能性を常に維持** — 表示文字列はハードコードせず、将来 `next-intl` で抽出できる形にする (初期は定数化)。
- **SEO/メタデータ** — `app/` の各ルートで `generateMetadata` を必ず実装 (認証必須ページを除く)。
- **計測/分析を後付けしやすい構造** — 全ミューテーションは hook 経由で実行し、後から analytics 呼び出しを差し込める。
- **プラン制限 UI** — 有料化時に備え、`shared/ui/upgrade-prompt.tsx` のような差し込みポイントを将来の feature 境界で想定する。
- **アクセシビリティ (WCAG 2.1 AA)** — Radix/Base UI ベースの shadcn/ui を崩さず使う。`aria-*` を削らない。

### 1-3. マルチデバイス対応 (本プロジェクトの最優先原則)
本アプリの中核ユースケースは **「学習中に浮かんだメモを素早く打ち込み、カード化する」**。この操作は **モバイルでもPCでも同等に快適** でなければならない。どちらかに偏った設計は避け、両デバイスで最速の入力体験を作る。

#### 共通原則
- **全画面・全コンポーネントをモバイルレイアウトから設計** する (レイアウトの崩れを防ぐ基本姿勢)。
- **ページ読み込みを軽量に** — 1ルートあたり JS は **≤ 150KB gzipped** を目標。
- **オフライン耐性** — ネットワーク断時のメモ入力をローカル保存 → 再送する仕組みを Phase 2 以降で検討。
- **対象ブラウザ**: iOS Safari / Android Chrome / デスクトップ Chrome / Safari / Edge / Firefox 最新版。

#### モバイル向け最適化 (ネイティブアプリ的な操作性)
- **タップターゲットの最小サイズは 44×44px** (Apple HIG / Material Design 基準)。ボタン・リンク・アイコンに徹底。
- **ボトムタブバー** — 認証後の主要ナビゲーション (ダッシュボード / デッキ / メモ / 復習 / 設定) は画面下部の**固定タブバー**に配置。iOS/Android ネイティブアプリに準じた操作感を出す。
  - `widgets/app-shell/bottom-tab-bar.tsx` で実装
  - `md:` 以上では非表示 → 左サイドバーに置き換え
- **タップによるドラッグ&ドロップ対応** — 以下の操作で導入:
  - デッキ内のカード並び替え (学習順序の調整)
  - タグの並び替え / メモの整理
  - AI候補の複数採用時の順序付け
  - 実装: `@dnd-kit/core` + `@dnd-kit/sortable` を標準採用 (タッチセンサー対応)
  - 長押し → 振動 (`navigator.vibrate`) → ドラッグ、の一連のフィードバックを共通化
- **スワイプジェスチャ** — 復習セッションの評価は **カードを左右スワイプ** で Again/Good 等を選択可能に (Phase 3)
- **ボトムシート** — モーダル系は `md` 未満で `<Drawer />` (vaul ライブラリ相当) を使う。上から覆うダイアログは禁止。
- **プルトゥリフレッシュ** — 一覧画面で引っ張って更新 (TanStack Query の refetch をトリガー、Phase 1 以降)
- **メモ/カード入力画面は片手操作で完結** — 重要操作はサムリーチゾーン (画面下 1/3) に配置。
- **Virtual keyboard の考慮** — `env(safe-area-inset-bottom)` と `100dvh` を使い、キーボード出現時もボタンが隠れないレイアウトに。
- **トランジション** — 画面遷移に軽いアニメーション (`framer-motion` or CSS)。ただし React Server Component との相性を考慮して最小限に。

#### PC/デスクトップ向け最適化 (キーボード駆動の操作性)
本アプリのヘビーユーザーは PC をキーボードだけで操作できるべき。**mouse-less で全ての主要操作が完結する** ことを目標。

##### グローバル
| キー | 動作 |
|------|------|
| `Cmd/Ctrl + K` | コマンドパレット (画面遷移、検索、アクション、Phase 2+) |
| `?` | ショートカット一覧モーダル |
| `Esc` | ダイアログ/ドロワー/編集モードを閉じる |
| `g` → `d` | Go to Dashboard |
| `g` → `n` | Go to Notes |
| `g` → `r` | Go to Review |

##### コンテキスト別
| 画面 | キー | 動作 |
|------|------|------|
| **フォーム共通** | `Cmd/Ctrl + Enter` | フォーム送信 |
| **メモ作成** | `Cmd/Ctrl + S` | 保存 / `Cmd/Ctrl + Shift + Enter` 保存→AI生成へ |
| **候補レビュー** | `a` | 採用 / `r` 却下 / `e` 編集 / `j` 次 / `k` 前 / `A` 全採用 |
| **復習セッション** | `1/2/3/4` | Again/Hard/Good/Easy / `Space` 答えを表示 |
| **一覧画面** | `/` | 検索フォーカス / `n` 新規作成 / `j/k` で移動 / `Enter` で開く |

実装指針:
- 共通 hook `useKeyboardShortcut(key, handler, { when })` を `shared/hooks/` に作成
- ショートカット一覧は `shared/config/shortcuts.ts` で集中管理 (i18n可能に)
- 必ず `input`/`textarea` フォーカス時はグローバルショートカットを無効化

##### その他
- **マルチカラム活用** — `md:` 以上では画面幅を活かし、メモ一覧 + 候補プレビュー を 2 カラム並列表示等。
- **ホバー状態** — デスクトップでは `hover:` のフィードバックを明示 (モバイルでは無視される)。
- **キーボードフォーカスリング** — `focus-visible:` でリングを明示、`outline-none` だけで削除しない。
- **ドラッグ&ドロップ** — PC でも @dnd-kit でマウス操作可能 (同じコンポーネントでタッチ/マウス両対応)。

#### メモ→カード化フローの特別要件 (デバイス共通)
- **フォーム送信 = 1アクションで完了** — メモ保存と「AI生成へ進む」を同一ボタンで兼ねる (選択可)。
- **入力中の自動保存 (デバウンス)** — Phase 2 以降。送信ボタンを押せなくても下書きが残る。
- **AI生成→採用までのクリック数を最小化** — 候補一覧から 1 タップ/クリックで採用可能に。
- **モバイルはサムリーチ、PC はキーボードでそれぞれ最速動線**。両方の導線を設計する。

---

## 2. ディレクトリ構成

```
frontend/src/
├── app/                         # Next.js routing layer (thin)
│   ├── (public)/                # 未認証向け (LP, 料金表, 利用規約)
│   ├── (auth)/                  # 認証フロー (login, register, forgot-password)
│   ├── (app)/                   # 認証必須 (middlewareで保護)
│   │   ├── layout.tsx           # サイドバー等 app shell
│   │   ├── dashboard/page.tsx
│   │   ├── decks/...
│   │   ├── cards/...
│   │   ├── notes/...
│   │   ├── review/...
│   │   ├── templates/...
│   │   ├── stats/...
│   │   └── settings/...
│   ├── layout.tsx               # RootLayout
│   ├── providers.tsx            # Client Providers (QueryClient, Toast, Theme)
│   ├── not-found.tsx
│   └── error.tsx
│
├── features/                    # ドメイン機能 (ビジネスロジック + 専用UI)
│   └── <feature>/
│       ├── api/                 # TanStack Query hooks + API 関数
│       ├── components/          # feature 専用の UI
│       ├── hooks/               # feature 専用の hooks
│       ├── schemas/             # zod スキーマ
│       ├── types.ts             # feature 固有の型
│       ├── constants.ts         # feature 固有の定数
│       └── index.ts             # public API (barrel export)
│
├── entities/                    # ドメインモデル (型 + zod スキーマ、UIなし)
│   └── <entity>/
│       ├── types.ts
│       └── schemas.ts
│
├── widgets/                     # 複数 feature を組み合わせた大型UIブロック
│   ├── app-shell/               # 認証後のレイアウト (ヘッダー + サイドバー)
│   ├── public-header/
│   └── dashboard-overview/
│
├── shared/                      # アプリ全体で再利用する薄い部品
│   ├── ui/                      # shadcn/ui + プリミティブ拡張
│   ├── api/                     # axios client, interceptor, csrf
│   ├── hooks/                   # 横断的な hooks (useMediaQuery 等)
│   ├── lib/                     # utils, formatters (日時、数値)
│   ├── config/                  # env, URL 定数
│   └── types/                   # 横断的な型 (ApiError, Pagination)
│
└── middleware.ts                # 認証ガード (未ログインは /login へ)
```

### 2-1. レイヤー依存ルール (重要)

```
app  →  widgets  →  features  →  entities
                     ↓              ↓
                   shared  ←────────┘
```

- **上のレイヤーは下のレイヤーをimportしてよい**
- **同じレイヤー同士のimportは禁止** (例: `features/deck` が `features/card` を直接 import しない)
  - → 共通化が必要なら `shared/` か `entities/` に引き上げる
- **下のレイヤーが上のレイヤーを import することは厳禁**
- `entities/` は UI を持たない (型とバリデーションスキーマのみ)

### 2-2. feature ディレクトリの標準構造 (必須)

```
features/deck/
├── api/
│   ├── deck-queries.ts          # useDeckList, useDeck (useQuery)
│   ├── deck-mutations.ts        # useCreateDeck, useUpdateDeck, useDeleteDeck
│   └── endpoints.ts             # fetcher 関数 (axios 呼び出し)
├── components/
│   ├── deck-list.tsx            # 一覧表示
│   ├── deck-list-item.tsx       # 一覧の1行
│   ├── deck-form.tsx            # 作成/編集フォーム
│   ├── deck-form-dialog.tsx     # フォームをダイアログ化
│   └── deck-delete-confirm.tsx  # 削除確認
├── hooks/
│   └── use-deck-form.ts         # react-hook-form + zod のラップ
├── schemas/
│   └── deck-schemas.ts          # zod schema (createDeckSchema 等)
├── types.ts                     # Deck, DeckFormInput 等
├── constants.ts                 # DECK_NAME_MAX_LENGTH 等
└── index.ts                     # 外部公開する symbol のみ
```

### 2-3. 禁止事項
- `app/` 配下にビジネスロジックを書かない (ページは feature の components を組み立てるだけ)
- `shared/ui/` 配下にドメインに依存した名前のファイルを置かない (例: `shared/ui/deck-card.tsx` は NG)
- feature 間で直接 import (`features/card` から `features/deck/components/*` を参照) 禁止
- Context による状態共有は最終手段 (まず feature hook + TanStack Query で解決を試みる)

---

## 3. 命名規則

### 3-1. ファイル / ディレクトリ
| 対象 | 規則 | 例 |
|------|------|-----|
| ファイル名 | **kebab-case** | `deck-list.tsx`, `use-deck-form.ts` |
| ディレクトリ名 | **kebab-case** (単数形) | `features/deck/`, `shared/ui/` |
| 1ファイル1 default export を避け named export | — | `export function DeckList() {}` |
| page/layout/loading/error | Next.js 規約に従う | `page.tsx`, `layout.tsx` |

### 3-2. コード内識別子
| 対象 | 規則 | 例 |
|------|------|-----|
| コンポーネント | PascalCase | `DeckList`, `CardReviewDialog` |
| 型 / Interface | PascalCase | `Deck`, `DeckFormInput`, `ApiError` |
| 型の Props | `<Component>Props` | `DeckListProps` |
| hook | `use` + camelCase | `useDeckList`, `useCreateDeck` |
| 関数 | camelCase (動詞から) | `formatDueDate`, `parseCardType` |
| 定数 | SCREAMING_SNAKE_CASE | `MAX_CARDS_PER_DECK`, `API_BASE_URL` |
| enum / union | PascalCase の型、値は kebab-case or SCREAMING_SNAKE | `CardType = "basic-qa" | ...` |
| Boolean Props | `is*` / `has*` / `can*` / `should*` | `isSuspended`, `hasError`, `canEdit` |
| event handler prop | `on*` | `onSubmit`, `onCardSelect` |
| event handler 実装 | `handle*` | `handleSubmit`, `handleCardClick` |

### 3-3. ドメイン固有の語彙 (要件定義書と揃える)
- **deck** / **card** / **note-seed** / **ai-card-candidate** / **domain-template**
- 複数形が必要な時は `decks`, `cards` のように単純に `s` を付ける
- 略さない: `deck` を `dk` としない。ただし一般的省略 (id, url, db) は許可。

---

## 4. コンポーネント設計ルール

### 4-1. 責務の分離
1 コンポーネントの責務は以下のうち **1つまで**:
- **表示 (Presentational)** — props を受け取って描画のみ
- **データ取得 (Container)** — hook を呼び、下位コンポーネントへ渡す
- **フォーム管理** — react-hook-form のラッパー
- **レイアウト** — 子要素の配置のみ

下記が指針:
- **≤ 200 行** を目安。超えたら分割を検討。
- **ネストされた map** が2段以上になったら子コンポーネント化。
- **条件分岐による render branch が3つ以上**なら別コンポーネントへ。

### 4-2. Props 設計
```tsx
// Good: 型を明示、optional は ? で、default は destructuring で
interface DeckListItemProps {
  deck: Deck;
  onSelect?: (id: number) => void;
  isSelected?: boolean;
}

export function DeckListItem({
  deck,
  onSelect,
  isSelected = false,
}: DeckListItemProps) {
  // ...
}
```

- **`any` / `unknown` を props の型に使わない**
- **spread props を children コンポーネントに無闇に流さない** (型安全が崩れる)
- **children を受け取るときは `children: React.ReactNode`** を明示

### 4-3. Server Component vs Client Component
- **デフォルトは Server Component** (`"use client"` を書かない)
- Client Component にする条件:
  - `useState`, `useEffect`, `useReducer` を使う
  - event handler を DOM に渡す (`onClick` 等)
  - Browser API を使う
  - TanStack Query / react-hook-form / zustand を使う
- `"use client"` は **可能な限りリーフに近い位置に置く** (大きなツリーを client 化しない)

### 4-4. 共通パターン

#### パターン A: Feature Container
```tsx
// features/deck/components/deck-list.tsx
"use client";

export function DeckList() {
  const { data, isLoading, error } = useDeckList();
  if (isLoading) return <DeckListSkeleton />;
  if (error) return <ErrorState error={error} />;
  if (!data?.length) return <EmptyState />;
  return (
    <ul>
      {data.map((deck) => (
        <DeckListItem key={deck.id} deck={deck} />
      ))}
    </ul>
  );
}
```

#### パターン B: Form Component (react-hook-form + zod)
```tsx
// features/deck/components/deck-form.tsx
"use client";

export function DeckForm({ onSuccess }: DeckFormProps) {
  const form = useDeckForm();
  const createDeck = useCreateDeck();

  const handleSubmit = form.handleSubmit(async (values) => {
    await createDeck.mutateAsync(values);
    onSuccess?.();
  });

  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

## 5. 状態管理方針

| 種別 | 方法 | 用途 |
|------|------|------|
| **Server 状態** | TanStack Query | APIから取得したデータ (deck一覧、カード等) |
| **ローカル UI 状態** | `useState` / `useReducer` | モーダルの open/close、タブの選択 |
| **フォーム状態** | react-hook-form | 全フォーム |
| **URL 状態** | `searchParams` | フィルタ、ページネーション、検索キーワード |
| **グローバル UI 状態 (軽量)** | React Context | Theme (dark/light)、Locale |
| **グローバル UI 状態 (複雑)** | Zustand | 必要になってから導入 (MVP では不要) |

### 5-1. TanStack Query 規約
- **queryKey の形式**: `['resource', ...args]` (配列、階層的)
  - `['decks']`, `['decks', deckId]`, `['decks', deckId, 'cards']`
- **queryFn は別ファイル** (`features/<f>/api/endpoints.ts`) に分離
- **mutation 成功時は invalidateQueries で明示的に再取得**
- **楽観的更新は Phase 4 以降に検討** (MVPではシンプルに)

---

## 6. スタイリング規約

### 6-1. Tailwind 運用
- **Tailwind Utility First** — インラインスタイル / CSS Module は使わない
- **`@apply` は使わない** (保守性低下のため)
- **条件付きクラスは `cn()` ヘルパー** (`shared/lib/utils.ts`)
- **Design Token は `globals.css` の CSS 変数で管理**
- **prefix付きユーティリティを優先** (`hover:`, `focus-visible:`, `md:`, `dark:`)

### 6-2. Variants
バリエーションのあるコンポーネントは **CVA (class-variance-authority)** を使う。shadcn/ui のパターンに従う。

```tsx
const badgeVariants = cva("inline-flex rounded-full px-2 py-0.5 text-xs", {
  variants: {
    variant: {
      default: "bg-primary/10 text-primary",
      warning: "bg-yellow-100 text-yellow-700",
    },
  },
  defaultVariants: { variant: "default" },
});
```

### 6-3. レスポンシブ (モバイルファースト徹底)

#### ブレイクポイント
Tailwind デフォルトをそのまま使う。
```
base: 0-639px    (モバイル、主ターゲット)
sm:   640-767px  (大きめスマホ / 縦向きタブレット)
md:   768-1023px (タブレット)
lg:   1024px+    (デスクトップ)
```

#### 実装ルール
1. **Breakpoint なし記述 = モバイル向け**。必ずここから書く。
2. **`md:` / `lg:` はデスクトップでの拡張のみに使う**。モバイルで崩すのは禁止。
3. **レイアウトは縦積み (flex-col) が基本**、`md:` 以上で `md:flex-row` / `md:grid-cols-*` に拡張。
4. **フォント・余白もモバイル基準**。`text-base` からスタートし `md:text-lg` で拡張する。
5. **最大幅は `max-w-*` で明示**。モバイルは 100% 幅、`md:` 以上で `max-w-2xl` など。

#### タップターゲット
- **最小 44×44px** を保証: Tailwind なら `min-h-11 min-w-11` または `h-12`。
- shadcn/ui の `size="default"` は高さ 32px で**小さすぎる**。`size="lg"` (36px) も不十分。
  - → `shared/ui/button.tsx` にモバイル向け size を追加 (`size="touch"` で h-11 相当)。
- アイコンボタンは `size-11` 以上。

#### Safe Area / Keyboard
- ページの root は `min-h-dvh` (動的ビューポート) を使う。`min-h-screen` (100vh) は iOS Safari でキーボード出現時に崩れる。
- 下部固定のバー/ボタンには `pb-[env(safe-area-inset-bottom)]` を付与。
- フォームのフッター固定ボタンは `sticky bottom-0` + safe-area-inset。

#### レイアウト指針
| 画面タイプ | モバイル (base) | デスクトップ (md+) |
|-----------|----------------|--------------------|
| 一覧 | 1カラム、フルワイド、カード/リスト形式 | `md:grid-cols-2` or `lg:grid-cols-3` |
| フォーム | 1カラム、ラベル上、入力下 | ラベル左・入力右の2カラムも可 |
| ナビ | ボトムタブバー or ハンバーガー | 左サイドバー |
| モーダル | **ボトムシート** (`<Drawer />`) | 中央ダイアログ (`<Dialog />`) |
| テーブル | カードリスト化 (horizontal scroll は最終手段) | テーブルのまま |

#### メモ入力 / カード入力画面の特別要件
- textarea は **`min-h-32` 以上 + autoGrow**
- 主要ボタン (保存、AI生成へ) は **画面下部に sticky 配置**、サムリーチで押せる位置に
- 「戻る」は画面左上、「完了/保存」は画面右上または下部中央 (iOS 流儀に合わせる)
- バリデーションエラーはインライン表示、スクロールして見えなくなる位置には出さない

---

## 7. フォーム・バリデーション

### 7-1. スタック
- **react-hook-form** — フォーム状態管理
- **zod** — スキーマバリデーション
- **@hookform/resolvers/zod** — 両者を接続

### 7-2. 配置
- **zod schema は `features/<f>/schemas/` に**
- **schema から型を推論** (`z.infer<typeof schema>`)
- **サーバー側 Laravel のバリデーションと key を揃える** (`name`, `email` 等)

### 7-3. 例
```ts
// features/auth/schemas/auth-schemas.ts
export const loginSchema = z.object({
  email: z.string().email("メールアドレスの形式が正しくありません"),
  password: z.string().min(8, "パスワードは8文字以上必要です"),
});
export type LoginInput = z.infer<typeof loginSchema>;
```

---

## 8. エラーハンドリング・通知

### 8-1. レイヤー別の責務
| レイヤー | 責務 |
|----------|------|
| **axios interceptor** | 401→ログアウトリダイレクト、5xx→toast で通知 |
| **TanStack Query** | queryFn 内でエラー throw、hook が `error` として公開 |
| **コンポーネント** | `error` state を UI に反映 (`<ErrorState error={error} />`) |
| **Error Boundary (app/error.tsx)** | Render エラーの最終セーフティネット |

### 8-2. Toast
**sonner** を採用。`shared/ui/toaster.tsx` で `<Toaster />` を提供し `app/providers.tsx` に設置。

```tsx
import { toast } from "sonner";
toast.success("デッキを作成しました");
toast.error("保存に失敗しました");
```

### 8-3. ローディング / 空状態
- **`<Skeleton />`** — データ取得中
- **`<EmptyState />`** — データ 0 件
- **`<ErrorState />`** — エラー発生時

これらは `shared/ui/` に標準コンポーネント化する。

---

## 9. アクセシビリティ

- shadcn/ui (Base UI / Radix) の `aria-*` 属性を削らない
- 全ての interactive 要素はキーボード操作可能に
- フォーム input には対応する `<label>` を必ず
- 色だけで情報を伝えない (アイコン + テキスト)
- 自動テスト: Playwright + `@axe-core/playwright` を主要フローに

---

## 10. テスト戦略

テスト戦略の **正典は `docs/07_testing_strategy.md`**。概要のみ以下に示す。

| レイヤー | ツール | 対象 | 配置 |
|----------|--------|------|------|
| **Unit** | Vitest | `shared/lib/`, `features/*/schemas/`, hooks | 同階層 `*.test.ts(x)` |
| **Component** | Vitest + Testing Library | feature components, shared/ui | 同階層 `*.test.tsx` |
| **Integration** | Vitest + MSW | feature のデータフロー | 同階層 or `__tests__/` |
| **E2E** | Playwright (mobile + desktop) | 主要ユーザージャーニー | `frontend/e2e/` |

- MSW ハンドラは `src/test/msw/handlers/` に feature 別に配置
- TanStack Query を含む Provider 付き render は `src/test/render.tsx` を使う
- カバレッジ目標: 全体 60%+、schemas 100%、shared/lib 90%+
- コマンド: `npm test` / `npm run test:run` / `npm run test:coverage` / `npm run e2e`

---

## 11. パフォーマンス

### 初期実装ですべきこと
- 画像は `next/image`
- フォントは `next/font`
- Client Component の肥大化を避ける
- `React.lazy` / `dynamic()` は重いコンポーネント (チャート等) で適用

### Phase 4 以降
- Core Web Vitals 計測 (Vercel Analytics or Umami)
- Bundle analyzer で定期確認

---

## 12. SEO / メタデータ

- `app/(public)/` と `app/(auth)/` の各 page で `generateMetadata` 実装
- `app/(app)/` (ログイン後) は `title` のみで十分
- `public/favicon.ico`, `public/og-image.png` を用意
- `robots.txt` / `sitemap.ts` (`app/sitemap.ts`) は公式リリース前に追加

---

## 13. i18n 準備 (MVP 時点)

- **文字列はファイル内ハードコード禁止ではないが、feature 単位で `constants.ts` への集約を推奨**
  - → 将来 `next-intl` のキー抽出が容易になる
- 言語切替 UI は実装しないが、将来差し替え可能な設計を維持

---

## 14. 収益化への備え

### 14-1. プラン概念
- `entities/user/types.ts` に `plan: "free" | "pro"` 等の型余地を作る
- バックエンドの `users.plan` カラム追加に合わせて随時拡張

### 14-2. 機能制限 UI
- プラン制限がかかる箇所では `<UpgradePrompt feature="ai-generation" />` のような共通コンポーネントを表示
- `shared/ui/upgrade-prompt.tsx` に定義

### 14-3. 課金導線
- `app/(app)/billing/` を将来予約 (今は作らない)
- Stripe 等の SDK は Phase 4 以降

---

## 15. ワークフロー (Claude Code Skills)

本プロジェクトでは以下の skill で UI 作成を標準化する:

| skill | 用途 | 起動 |
|-------|------|------|
| `ui-new-feature` | 新しい feature ディレクトリを scaffold | `/ui-new-feature <name>` |
| `ui-new-component` | feature 内に新規コンポーネントを追加 | `/ui-new-component <feature> <name>` |
| `ui-new-page` | `app/` 配下に新規ルートを追加 | `/ui-new-page <path>` |
| `ui-review` | 作ったUIをルールに照らしてセルフレビュー | `/ui-review <path>` |

詳細は `.claude/skills/*/SKILL.md` を参照。

---

## 16. チェックリスト (PR/コミット前)

### コード品質
- [ ] `npm run lint` が通る
- [ ] `npx tsc --noEmit` が通る
- [ ] ファイル名は kebab-case
- [ ] コンポーネント名・型名は PascalCase、hook は `use*`
- [ ] 1 ファイル 200 行未満 (目安)
- [ ] `any` を使っていない
- [ ] Server/Client Component の境界が適切
- [ ] `"use client"` が必要最小限のリーフにある
- [ ] aria 属性・label を省略していない
- [ ] 新規文字列が feature の `constants.ts` に集約されている (or 将来集約可能)
- [ ] テストを追加した (or 追加しない理由が明確)

### モバイル対応 (必須)
- [ ] モバイル (375×667, iPhone SE) で崩れない
- [ ] タップターゲットが最小 44×44px (`min-h-11 min-w-11` or `h-12`)
- [ ] `min-h-dvh` を使い `100vh` を避けている
- [ ] 下部固定要素に `pb-[env(safe-area-inset-bottom)]` が付いている (該当時)
- [ ] メモ/カード入力画面で、キーボード出現時に主要ボタンが隠れない
- [ ] モーダル系は `md` 未満で `<Drawer />` (ボトムシート) を使っている
- [ ] Chrome DevTools の Mobile preview で実機サイズで動作確認済み

### PC/デスクトップ対応 (必須)
- [ ] タブキーでフォーカス移動が論理的な順序
- [ ] `focus-visible:` でフォーカスリングが見える
- [ ] 該当画面でキーボードショートカットが実装されている (メモ入力、復習、候補レビュー等)
- [ ] `hover:` 状態のフィードバックがある
- [ ] `md:` 以上でマルチカラム/広幅レイアウトに切り替わる (一覧・詳細画面)
- [ ] メモ→カード化フローが キーボードのみで完結可能
