# Tessera CLI

Tessera(AIフラッシュカード)のコマンドラインクライアント。メモの捕捉・ターミナル復習・MCP ブリッジを提供する。

## セットアップ

```bash
cd cli
npm install
npm run build
npm link   # `tessera` コマンドをグローバルに登録 (任意)
```

## コマンド

```bash
# 認証 (トークンは ~/.config/tessera/config.json に 0600 で保存)
tessera login                       # フルアクセストークン
tessera login --scope mcp           # MCP 専用トークン
tessera login --api-url https://tessera.example.com

# メモ捕捉
tessera capture "DIコンテナは依存解決を一元化する仕組み"
tessera capture --file notes.md
cat notes.md | tessera capture

# ターミナル復習 (1=もう一度 2=難しい 3=普通 4=簡単 q=終了)
tessera review
tessera review --deck 3 --limit 10

# stdio MCP ブリッジ (stdio しか話せない MCP クライアント向け)
tessera mcp
```

## MCP クライアント設定例

Claude Code は HTTP 直接続を推奨(ブリッジ不要):

```bash
claude mcp add --transport http tessera https://<host>/mcp \
  --header "Authorization: Bearer <TOKEN>"
```

stdio しか対応していないクライアント(Claude Desktop の mcpServers 等)はブリッジを使う:

```json
{
  "mcpServers": {
    "tessera": {
      "command": "tessera",
      "args": ["mcp"]
    }
  }
}
```

## 環境変数

| 変数 | 説明 |
| --- | --- |
| `TESSERA_API_URL` | API ベースURL(config.json より優先) |
| `TESSERA_TOKEN` | Bearer トークン(config.json より優先。CI 等で使用) |
| `TESSERA_CONFIG_DIR` | 設定ディレクトリの上書き(既定: `~/.config/tessera`) |

## 開発

```bash
npm run build      # tsup で dist/ にビルド
npm run typecheck  # tsc --noEmit
npm test           # vitest
```
