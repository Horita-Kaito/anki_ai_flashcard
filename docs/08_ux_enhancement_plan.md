# UX 強化プラン

本書は、他サービスで採用されている効果的な UI パターンを整理し、本アプリでの適用順序を決める。

---

## 参照する他サービスと学ぶべきパターン

### モバイル (SP)

| サービス | 学ぶべきパターン | 本アプリでの適用 |
|---------|----------------|----------------|
| **Anki Mobile** | スワイプで評価 (左: Again, 右: Good) | 復習画面 |
| **Quizlet** | カードフリップアニメーション (3D transform) | 復習画面 |
| **Duolingo** | 進捗リング、連続日数、ストリーク | ダッシュボード |
| **Google Keep** | FAB (Floating Action Button) 即メモ | グローバルナビ |
| **iOS Notes** | プルトゥリフレッシュ、スワイプで削除 | 一覧画面 |
| **Instagram Reels** | ハプティクスフィードバック | 評価ボタン |
| **Twitter** | ボトムタブの中央 FAB | メモ即作成導線 |

### PC

| サービス | 学ぶべきパターン | 本アプリでの適用 |
|---------|----------------|----------------|
| **Linear** | Cmd+K コマンドパレット | グローバル検索 + 遷移 + アクション |
| **Raycast** | 階層的なコマンド、Fuzzy search | 同上 |
| **Notion** | インライン編集、ドラッグ&ドロップ | 並び替え |
| **GitHub** | キーボードショートカット (? でヘルプ) | ショートカット一覧 |
| **Figma** | Ctrl/Cmd+D で複製など定型ショートカット | カード複製 (将来) |
| **VS Code** | Quick Open (Cmd+P) | 同 Cmd+K に統合 |
| **Superhuman** | 全操作キーボード対応、即時性 | 復習/候補レビュー |

---

## 適用優先度

### 優先度 A (即時実装推奨、影響大)

#### A-1. 復習カードのフリップアニメーション
- **参照**: Quizlet、Anki Mobile
- **実装**: CSS `transform: rotateY(180deg)` + `transition` (300ms)
- **効果**: 問題→答えの視覚的切替が直感的に。学習体験が格段に向上。
- **配置**: `features/review/components/review-card-flip.tsx`

#### A-2. 復習画面のスワイプ評価 (モバイル)
- **参照**: Anki Mobile、Tinder-style card swipe
- **実装**: `react-swipeable` (軽量、pointer events)
  - 左スワイプ: Again、右スワイプ: Good
  - 中央から上下スワイプ: Hard / Easy (optional)
- **フィードバック**: スワイプ中にカードが傾く + 色ヒント
- **ハプティクス**: `navigator.vibrate(30)` で微振動

#### A-3. キーボードショートカットヘルプ (`?` キー)
- **参照**: GitHub、Linear、Figma
- **実装**: `?` キーでモーダル表示、全ショートカット一覧
- **shortcut 定義**: `shared/config/shortcuts.ts` に集約、i18n 可能
- **配置**: `shared/ui/shortcut-help-dialog.tsx` + グローバル listener

#### A-4. Cmd+K コマンドパレット
- **参照**: Linear、Raycast、VS Code
- **機能**:
  - ナビゲーション (Go to decks, notes, review, ...)
  - 検索 (Search in cards / notes)
  - アクション (New memo, New card, New deck, Start review)
- **実装**: `cmdk` ライブラリ (shadcn/ui 互換)
- **Fuzzy search**: ローカル (遷移先) + 将来的にサーバー検索API統合

### 優先度 B (中期、実装中程度)

#### B-1. FAB (Floating Action Button) モバイル
- **参照**: Google Keep、Twitter
- **実装**: ボトムタブバー中央に「+」FAB、タップで「メモ作成」直行
- **効果**: メモ→カード化の主フローへ 1 タップで到達

#### B-2. デッキ順序 DnD
- **参照**: Notion、iOS Notes
- **実装**: `@dnd-kit/core` + `@dnd-kit/sortable`
- **Backend**: `decks.display_order` カラム追加 + reorder API
- **タッチ対応**: 長押し → 振動 → ドラッグ

#### B-3. プルトゥリフレッシュ (モバイル)
- **参照**: iOS/Android ネイティブ
- **実装**: `react-pull-to-refresh` or 自前 (TanStack Query の refetch)
- **対象**: 一覧系画面全般

#### B-4. 進捗リング + ストリーク (ダッシュボード)
- **参照**: Duolingo、Apple Watch アクティビティ
- **実装**: SVG 円弧で達成率を表現、連続学習日数を表示
- **効果**: 継続モチベーション向上

#### B-5. カード複製 / Undo トースト
- **参照**: Gmail (削除 → Undo)、Figma
- **実装**: Sonner の `toast.success(msg, { action })` で Undo 提供
- **対象**: カード削除、候補却下などの「戻せる操作」

### 優先度 C (長期、実装大)

#### C-1. View Transitions API (ページ遷移)
- **参照**: iOS アプリ、Instagram
- **実装**: Next.js 15+ の View Transitions
- **効果**: SPA の遷移が滑らか、ネイティブ感

#### C-2. ダークモード切替
- **参照**: 多くのモダン web app
- **実装**: `next-themes` + CSS 変数
- **Tailwind**: 既に `dark:` utility 対応済み

#### C-3. 通知・リマインダー
- **実装**: Web Push API + Service Worker
- **効果**: 学習継続のナッジ

#### C-4. PWA 対応
- **実装**: `next-pwa` + manifest.json + service worker
- **効果**: ホーム画面追加、オフライン対応

---

## 実装の順序 (今回のスプリント)

1. **復習フリップアニメーション** (A-1)
2. **スワイプ評価** (A-2)
3. **ショートカットヘルプ** (A-3)
4. **コマンドパレット** (A-4)
5. その後、B-1 (FAB) と B-5 (Undo トースト) を検討

各実装時に以下を徹底:
- **モバイルとPC両方で自然な操作**
- **アクセシビリティ**: aria-keyshortcuts, role="dialog", フォーカストラップ
- **パフォーマンス**: アニメーションは GPU (transform/opacity のみ)
- **軽量**: 外部依存は最小限 (cmdk / react-swipeable 程度)

---

## 設計上の原則

### キーボードショートカットの集約管理
`shared/config/shortcuts.ts` に一元定義:
```ts
export const SHORTCUTS = [
  { key: "Cmd+K", description: "コマンドパレット", scope: "global" },
  { key: "?", description: "ショートカット一覧", scope: "global" },
  { key: "1", description: "Again", scope: "review" },
  { key: "2", description: "Hard", scope: "review" },
  ...
];
```

この配列を ShortcutHelpDialog と実際の handler 登録の両方で使う (単一の真実源)。

### スワイプ閾値
- **水平閾値**: 画面幅の 25% 超で確定
- **途中キャンセル**: 戻す動作 → 元位置にスプリング復帰
- **速度**: `velocity > 0.5px/ms` でも確定 (フリック検知)

### アニメーション時間
- **Micro-interaction** (hover, tap): 150ms
- **Transition** (panel open, card flip): 250-300ms
- **Large movement** (page transition): 400ms
- **easing**: CSS `cubic-bezier(0.4, 0, 0.2, 1)` (Material standard)

### ハプティクス使用規範
- **成功フィードバック** (採用、評価): 30ms 1回
- **警告** (却下、エラー): 50ms + 50ms 2回
- **重要アクション** (カード採用完了): 80ms 1回
- ユーザー設定で無効化可能に (`user_settings.haptics_enabled` 将来追加)
