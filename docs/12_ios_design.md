# iOS設計書

本書は `ios/` 配下の SwiftUI アプリ開発ルールを定義する。iPhoneアプリ版は完全ローカルアプリとして実装し、Laravel Backend には依存しない。

## 1. 基本方針

- UI は SwiftUI を標準とする。
- iOS 17.0+ を対象にする。
- 正式データは SwiftData で端末内に保存する。
- iOS版はログインを必須にしない。
- AI候補生成は端末内ローカルLLMを標準とする。
- Laravel API / Sanctum / Bearer token は Web/Backend 互換用に残してもよいが、iOSの主要導線からは使わない。
- AI候補は自動採用しない。Web版と同じく人間のレビューを必須にする。

## 2. ディレクトリ構成

```text
ios/ManaMemoAI/
├── App/
├── Core/
│   ├── API/
│   ├── Auth/
│   ├── Config/
│   ├── Keychain/
│   ├── LocalLLM/
│   └── Persistence/
├── Features/
│   └── <FeatureName>/
└── Shared/
    ├── Components/
    └── Models/
```

### 配置ルール

- `App/`: app entry point, root navigation, global composition only.
- `Core/API/`: Backend互換用APIクライアント。完全ローカル導線では原則使わない。
- `Core/Auth/`: Backend互換用認証コード。完全ローカル導線では原則使わない。
- `Core/Keychain/`: 将来の任意同期や外部連携用secret保存。
- `Core/LocalLLM/`: 端末内LLM実行、プロンプト、JSON整形、生成候補変換。
- `Core/Persistence/`: SwiftData model とローカル永続化。
- `Features/<FeatureName>/`: feature-specific views, models, services.
- `Shared/`: cross-feature UI and pure models only.

Feature 間の直接依存は避ける。共有が必要なら `Shared/` または `Core/` に引き上げる。

## 3. 命名規則

- Swift file: PascalCase (`DeckListView.swift`, `NoteSeedService.swift`)
- View: `<Name>View`
- API service: `<Domain>Service`
- DTO/model: domain name (`Deck`, `NoteSeed`, `TokenResponse`)
- Request body: `<Action><Domain>Request`
- Protocol: `<Name>Protocol` ではなく、既存コードに合わせて用途名を優先する。例: `AuthTokenStore`

## 4. ローカル永続化

- 正式データは SwiftData の `@Model` で保持する。
- デッキ、メモ、AI候補、採用済みカード、復習スケジュールは端末内保存を正とする。
- API response DTO と SwiftData model を混同しない。ローカル正式データは `Local*` prefix を使う。
- 機種変更やバックアップは、初期段階では iOS の端末バックアップに委ねる。
- 将来同期を追加する場合も、iOSローカルDBを正として差分同期する。同期を理由に主要操作をオンライン必須にしない。

## 5. ローカルLLM

- 端末内LLMは `Core/LocalLLM/` に閉じる。
- GGUF / `llama.cpp` 系ランタイムを第一候補にする。
- 初期ターゲットモデルは `Qwen2.5-3B-Instruct` の量子化モデルを候補にするが、古い端末向けに 0.5B/1.5B class のフォールバックを持てる設計にする。
- モデルファイルはアプリバンドルに同梱せず、初回セットアップ後に端末へダウンロードする方針を優先する。
- LLM出力は構造化JSONとして扱い、パース失敗時はリトライまたはユーザーに再生成を促す。
- AI候補は自動採用しない。生成後に必ずユーザーが確認・編集・採用する。

## 6. Backend互換API実装

- API response は `APIEnvelope<T>` で受ける。
- Laravel の snake_case は `JSONDecoder.keyDecodingStrategy = .convertFromSnakeCase` で扱う。
- 日時は ISO 8601 を前提にする。
- 204 response は `EmptyResponse` を使う。
- Error response の `message` を user-facing error として表示してよい。
- `APIClient` 以外で `URLSession.shared.data` を直接呼ばない。
- `AppConfig.apiBaseURL` を通じて base URL を読む。
- 完全ローカル導線では新規画面から `APIClient` に依存しない。

## 7. 認証

- iOS版の通常利用にログインは不要。
- 任意同期や外部バックアップを後から追加する場合のみ、認証導線を復活させる。
- token やsecretを使う場合は `UserDefaults` に保存しない。
- Keychain access は `Core/Keychain/` に閉じる。

## 8. Swift Concurrency

- Swift 6 の strict concurrency を前提にする。
- UI状態を持つ store/service は `@MainActor` を基本にする。
- `Task {}` 内で UI state を更新する場合、呼び出し先の actor isolation を明確にする。
- `@unchecked Sendable` は原則禁止。使う場合は理由をコメントに残す。

## 9. UI/UX

- 主要画面は `NavigationStack` を使う。
- 入力画面は片手操作を優先し、主要アクションを明確にする。
- 一覧画面は loading / empty / error を必ず持つ。
- エラーは user-facing にし、開発者向け詳細をそのまま表示しない。
- Symbol は SF Symbols を使う。
- Preview macro は CLI build が安定するまで必須にしない。
- オフラインで操作できることを前提に、通信エラー中心のUIにしない。

## 10. テストと検証

最低限の検証:

```bash
xcodebuild -project ios/ManaMemoAI.xcodeproj -scheme ManaMemoAI -destination generic/platform=iOS -derivedDataPath /private/tmp/ManaMemoAI-DerivedData CODE_SIGNING_ALLOWED=NO build
```

実機/Simulator の手動確認が必要な場合のみ Xcode を開く。CLIで済む作業では Xcode を開かない。

## 11. コミット前チェック

- `ios-review` skill を使う。
- `xcodebuild ... CODE_SIGNING_ALLOWED=NO build` が通ること。
- Backend API 変更を伴う場合は `api-review` と関連PHPUnitも実行する。
