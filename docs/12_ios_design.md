# iOS設計書

本書は `ios/` 配下の SwiftUI アプリ開発ルールを定義する。Backend は既存 Laravel API を利用し、iOS は別クライアントとして実装する。

## 1. 基本方針

- UI は SwiftUI を標準とする。
- iOS 17.0+ を対象にする。
- Backend API は `docs/03_api_specification.md` を正とする。
- 認証は Sanctum Personal Access Token を使う。
- Cookie / CSRF 認証は iOS では使わない。
- token は Keychain に保存し、`Authorization: Bearer <token>` を付与する。
- AI候補は自動採用しない。Web版と同じく人間のレビューを必須にする。

## 2. ディレクトリ構成

```text
ios/ManaMemoAI/
├── App/
├── Core/
│   ├── API/
│   ├── Auth/
│   ├── Config/
│   └── Keychain/
├── Features/
│   └── <FeatureName>/
└── Shared/
    ├── Components/
    └── Models/
```

### 配置ルール

- `App/`: app entry point, root navigation, global composition only.
- `Core/API/`: `APIClient`, response envelope, API errors, JSON encoder/decoder.
- `Core/Auth/`: auth session, token issue/revoke, current user.
- `Core/Keychain/`: token persistence.
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

## 4. API実装

- API response は `APIEnvelope<T>` で受ける。
- Laravel の snake_case は `JSONDecoder.keyDecodingStrategy = .convertFromSnakeCase` で扱う。
- 日時は ISO 8601 を前提にする。
- 204 response は `EmptyResponse` を使う。
- Error response の `message` を user-facing error として表示してよい。
- `APIClient` 以外で `URLSession.shared.data` を直接呼ばない。
- `AppConfig.apiBaseURL` を通じて base URL を読む。

## 5. 認証

- Login: `POST /api/v1/tokens`
- Restore: token があれば `GET /api/v1/me`
- Logout: `DELETE /api/v1/tokens/current` の後、Keychain から削除
- token は `UserDefaults` に保存しない。
- Keychain access は `Core/Keychain/` に閉じる。

## 6. Swift Concurrency

- Swift 6 の strict concurrency を前提にする。
- UI状態を持つ store/service は `@MainActor` を基本にする。
- `Task {}` 内で UI state を更新する場合、呼び出し先の actor isolation を明確にする。
- `@unchecked Sendable` は原則禁止。使う場合は理由をコメントに残す。

## 7. UI/UX

- 主要画面は `NavigationStack` を使う。
- 入力画面は片手操作を優先し、主要アクションを明確にする。
- 一覧画面は loading / empty / error を必ず持つ。
- エラーは user-facing にし、開発者向け詳細をそのまま表示しない。
- Symbol は SF Symbols を使う。
- Preview macro は CLI build が安定するまで必須にしない。

## 8. テストと検証

最低限の検証:

```bash
xcodebuild -project ios/ManaMemoAI.xcodeproj -scheme ManaMemoAI -destination generic/platform=iOS -derivedDataPath /private/tmp/ManaMemoAI-DerivedData CODE_SIGNING_ALLOWED=NO build
```

実機/Simulator の手動確認が必要な場合のみ Xcode を開く。CLIで済む作業では Xcode を開かない。

## 9. コミット前チェック

- `ios-review` skill を使う。
- `xcodebuild ... CODE_SIGNING_ALLOWED=NO build` が通ること。
- Backend API 変更を伴う場合は `api-review` と関連PHPUnitも実行する。
