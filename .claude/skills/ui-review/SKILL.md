---
name: ui-review
description: 作成したUIコンポーネントやページを設計ルールに照らして自己レビューする。引数にファイルパスまたはディレクトリパスを受け取り、命名・責務分離・モバイル/PC両対応・アクセシビリティ・コード品質を観点別に評価する。
---

# UI Review Skill

作成した UI を `docs/05_frontend_design.md` のルールに照らして厳格にセルフレビューする。

## 引数
`<path>` — ファイルまたはディレクトリのパス。例: `frontend/src/features/deck/`, `frontend/src/app/(app)/decks/page.tsx`。

## レビュー観点

### 1. 命名規則
- [ ] ファイル名が kebab-case
- [ ] コンポーネント名が PascalCase、型が PascalCase、hook が `use*` camelCase
- [ ] 定数が SCREAMING_SNAKE_CASE
- [ ] Boolean prop が `is*` / `has*` / `can*` / `should*`
- [ ] event handler prop が `on*`、実装が `handle*`

### 2. ディレクトリ配置 (レイヤー依存)
- [ ] app/ → widgets/ → features/ → entities/ → shared/ の依存方向を守っている
- [ ] feature 間で直接 import していない
- [ ] shared/ui/ にドメイン固有の名前 (DeckCard 等) を置いていない
- [ ] feature 内のファイルが標準構造 (api, components, hooks, schemas) に従う

### 3. 責務分離
- [ ] 1 ファイル 200 行未満 (目安)
- [ ] 1 コンポーネント 1 責務 (表示 / コンテナ / フォーム / レイアウト のいずれか)
- [ ] Server Component と Client Component の境界が適切
- [ ] `"use client"` が必要最小限のリーフに付いている
- [ ] TanStack Query は Client Component 内のみ

### 4. Props 設計
- [ ] `interface <Name>Props` を定義している
- [ ] `any` / `unknown` を props に使っていない
- [ ] optional 引数が `?` で、default が destructuring で
- [ ] children を受け取る場合 `children: React.ReactNode` を明示

### 5. 状態管理
- [ ] サーバー状態 = TanStack Query
- [ ] フォーム = react-hook-form + zod
- [ ] ローカル UI = useState / useReducer
- [ ] URL 状態 = searchParams
- [ ] Context / Zustand を濫用していない

### 6. モバイル対応
- [ ] タップターゲット 44×44px 以上 (`min-h-11` / `h-12` / `size-11` 等)
- [ ] `min-h-dvh` を使い `100vh`/`h-screen` を避けている
- [ ] 下部固定要素に `pb-[env(safe-area-inset-bottom)]`
- [ ] モバイルは 1 カラム、`md:` 以上でマルチカラム
- [ ] モーダルは `md` 未満で `<Drawer />` (ボトムシート)
- [ ] ドラッグ&ドロップが必要な箇所は @dnd-kit を使用

### 7. PC/デスクトップ対応
- [ ] `hover:` のフィードバックがある (interactive 要素)
- [ ] `focus-visible:ring-*` でキーボードフォーカスが見える
- [ ] キーボードショートカットが該当画面で実装されている (該当時)
- [ ] `md:` 以上でマルチカラム/広幅レイアウト

### 8. アクセシビリティ
- [ ] `aria-*` 属性を削っていない (shadcn/ui の恩恵を残す)
- [ ] `<label>` が input に対応している
- [ ] `role="alert"` がエラー表示にある
- [ ] 色だけで情報を伝えていない (アイコン+テキスト)
- [ ] キーボードで全ての操作が可能

### 9. スタイリング
- [ ] Tailwind Utility First (インラインスタイル・CSS Module なし)
- [ ] `@apply` を使っていない
- [ ] 条件付きクラスは `cn()` を使う
- [ ] バリアントは CVA を使う

### 10. フォーム
- [ ] zod schema が `features/<f>/schemas/` に
- [ ] サーバー側 (Laravel) のバリデーションキーと揃っている
- [ ] `aria-invalid` と `role="alert"` をエラーに付与
- [ ] `autoComplete` が適切 (email, current-password, new-password 等)

### 11. 収益化・i18n 準備
- [ ] 表示文字列が constants.ts / schemas のメッセージに集約されている (または将来集約可能)
- [ ] 将来の課金制限UIの差し込みポイントを破壊していない
- [ ] SEO metadata (認証前ページ) が設定されている

### 12. テスト
- [ ] 重要なロジックにテストがある (or テストを書かない合理的理由がある)
- [ ] schema の境界値テストがある (該当時)

## 出力形式
以下の形式でレポートする:

```
# UI レビュー結果: <path>

## 観点別評価
### 1. 命名規則 — [Pass / Issue]
- ...

### 2. ディレクトリ配置 — [Pass / Issue]
- ...

...

## 総合評価: S / A / B / C / D

## 修正必須項目
1. ...
2. ...

## 改善提案
1. ...
```

## 注意
- 軽微な問題と致命的な問題を明確に区別する
- 「Pass」と「Issue」の理由を必ず根拠付きで示す
- ファイルの具体的な行番号や該当コードを引用する
