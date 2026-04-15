# ビジュアル洗練化プラン

現状は shadcn/ui + Tailwind neutral の無印状態。機能は揃っているが「個性」と「洗練感」が足りない。他サービスから学ぶべき点を整理し、段階的にブラッシュアップする。

---

## 参照サービス

| サービス | 学ぶ点 |
|---------|-------|
| **Linear** | 深い indigo 系プライマリ、微細な shadow、洗練されたタイポグラフィ |
| **Notion** | クリーンな余白設計、控えめなアクセントカラー、emoji の効果的活用 |
| **Duolingo** | 親しみやすい primary、ストリーク強調、マスコット的な温かみ |
| **Superhuman** | 極限までのコンパクト、キーボード駆動、余白のメリハリ |
| **Anthropic Claude** | 温かい中性色、読みやすい日本語タイポ、落ち着いた自信 |

---

## 優先度順のタスク

### A. フォント
- **Latin**: 既に Geist (Vercel系、洗練) → 継続
- **日本語**: Noto Sans JP を next/font/google で導入
  - Japanese headings: weight 500-700
  - Japanese body: weight 400
  - `font-feature-settings: "palt"` で日本語カーニング
- **Monospace**: JetBrains Mono に変更 (Geist Mono より読みやすい)

### B. カラーパレット
現状はほぼ純黒 (`oklch(0.205 0 0)`)。少し個性を持たせる:

- **Primary**: deep indigo `oklch(0.40 0.13 265)` - Linear的、学習アプリに品格
- **Success / Streak**: warm amber `oklch(0.77 0.17 70)` - 温かい達成感
- **Surface**: わずかに青みを入れた白 `oklch(0.99 0.003 260)`
- **Muted**: より柔らかい灰色に
- **Border**: 少し薄く (目立たないように)

### C. タイポグラフィスケール
- 見出し: `text-3xl` → `text-2xl` に落として密度を上げる (モバイル)
- `line-height` を日本語向けに 1.7 → 1.65 に調整
- `letter-spacing` を微調整 (見出しは -0.015em)
- フォントウェイトの階層化 (400 / 500 / 600 / 700 を使い分け)

### D. Shadow & Radius
- `shadow-sm` / `shadow` のみ使っていたが、`shadow-lg` + borderで深みを出す
- ボタン/カードの `rounded-xl` を場面により `rounded-2xl` に
- Glass morphism 風の backdrop-blur を FAB や sticky bar に追加済み

### E. 遷移・マイクロインタラクション
- ボタン hover: scale(1.02) + shadow up
- カード hover: subtle translate-y(-1)
- Focus ring: ring-2 ring-primary/40

### F. ランディングページ
- ヒーロー: 大きめの見出し + サブコピー + CTA
- フィーチャー 3 点 (AI候補生成 / 間隔反復 / 統計)
- ソーシャルプルーフ枠 (将来、利用者の声)
- フッター (利用規約、プライバシーポリシー、GitHub)

### G. 空状態・ローディング
- **Loading**: pulse → shimmer (gradient sweep)
- **Empty state**: アイコンを大きめに、CTA を明確に
- **Skeleton**: 実際のレイアウトに近い形状で

### H. アイコン・イラスト
- lucide-react の icon に `stroke-width={1.5}` で細身に
- 重要 CTA に emoji を一部使用 (🔥 ストリーク、✨ AI)

---

## 実装順序 (今回のスプリント)

1. **Font (Noto Sans JP + 設定)** — 即視覚改善
2. **Color palette + shadow refinement** — 品格アップ
3. **Landing page 全面改修** — 第一印象
4. **Skeleton / 空状態の洗練** — 細部の品質
