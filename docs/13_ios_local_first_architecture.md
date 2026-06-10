# iOS完全ローカルアーキテクチャ

## 方針

iPhoneアプリ版は、ユーザーの正式データとAI候補生成を端末内で完結させる。Laravel Backend は Web版または将来の任意同期用として残すが、iOS版の主要導線では必須にしない。

## データの正

- デッキ、メモ、AI候補、カード、復習スケジュールは SwiftData に保存する。
- ログインは不要。主要導線はログイン無しで完結する。
- 複数端末同期はオプトインで提供する（ログイン時のみ）。未ログインでもアプリは完全に使える。
- バックアップは iOS の端末バックアップ、および JSON エクスポート／インポートに委ねる。

## 端末間同期（オプトイン）

ログインしたユーザー向けに、Laravel Backend を経由した端末間同期を任意機能として提供する。未ログイン時は一切通信せず、ローカルのみで動作する。

- `SyncService`（iOS）と `SyncService`（Backend）が 1 リクエストで push（dirty + 削除）と pull（since 以降のサーバ差分）を行う。
- 安定キーはローカルの UUID（`client_id`）。サーバ↔ローカルの ID 対応表は持たない。
- 競合解決は `updated_at`（論理時刻）の Last-Write-Wins。**削除も LWW の対象**で、既存行より新しい削除のときだけ反映する。
- 削除は SoftDeletes ではなく専用 tombstone（`LocalSyncTombstone` / `sync_tombstones`）で伝播する。
- デッキ階層は `parent_client_id` でやり取りする。pull 後にデッキ本体を全件適用してから親参照を二段階で解決し、同一バッチ内で親が後に届いても階層を正しく組む。
- 同期カーソルと最終同期時刻はログイン中ユーザー単位で名前空間化する。ログアウト時に該当ユーザーのカーソルを破棄し、別アカウント再ログイン時に他人の差分カーソルを引き継がない。
- 既知の制限(v1): Web 側の削除は tombstone を作らないため iOS へは伝播しない（iOS↔iOS は完全に伝播する）。

## AI処理

- 端末内LLMを標準にする。
- GGUF / `llama.cpp` を第一候補にする。
- `Qwen2.5-3B-Instruct Q4_K_M` は高性能端末向け候補とする。
- 古い端末向けに 0.5B/1.5B class のモデルを選べる設計にする。
- LLM出力はカード候補JSONへ変換し、ユーザーが採用したものだけカード化する。
- iOSアプリ内には `LocalLLMRuntime` 境界を置き、実際の `llama.cpp` ブリッジはこの境界の具象実装として差し込む。
- 候補生成は `LocalCandidateGenerationService` が担当し、LLM生成とルールベースフォールバックのどちらで生成されたかをUIへ返す。
- 生成パラメータは `LocalLLMGenerationOptions` として保持し、最大トークン、温度、Top P、コンテキスト長をランタイムへ渡す。
- `llama.cpp` の公式 XCFramework を `ios/LlamaFrameworkPackage` の binary target として追加し、`LlamaFrameworkRuntime` を既定ランタイムにする。

## 実装ステップ

1. SwiftData のローカルモデルへiOS主要導線を移す。
2. ローカル候補生成インターフェースを作る。
3. モデル管理画面を追加する。
4. `LocalLLMRuntime` 境界、プロンプト生成、JSON出力パーサを追加する。
5. `llama.cpp` のiOS組み込みを検証する。
6. JSON grammar / retry / parse repair を実装する。
7. 復習スケジュールも端末内で完結させる。

## 復習

- 採用済みカードは `LocalCard.dueAt` をもとに復習対象へ出す。
- 評価は `again` / `hard` / `good` / `easy` の4段階を使う。
- 初期実装は端末内の簡易SRSでよい。FSRS完全互換は後続で検討する。

## カード管理

- 採用済みカードは端末内のカード一覧から検索・編集・削除できる。
- 編集は question / answer / explanation を対象にする。
- 復習状態はカード詳細で確認できるが、手動変更は後続で検討する。

## モデル候補

- 既定: `Qwen2.5-3B-Instruct Q4_K_M`
- 軽量: `Qwen2.5-1.5B-Instruct Q4_K_M`
- 最軽量: `Qwen2.5-0.5B-Instruct Q4_K_M`

## モデル管理

- GGUFモデルはアプリバンドルへ同梱せず、Application Support 配下の `Models/` に保存する。
- 設定画面からモデルファイルの存在確認、ダウンロード、削除ができる。
- 実行ランタイムはモデルファイルのローカルURLを受け取る。
