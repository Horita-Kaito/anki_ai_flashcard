---
name: ios-new-feature
description: |
  **必ず使用する条件**: ios/ManaMemoAI/Features/<FeatureName>/ 配下に新しい SwiftUI feature を作成するすべてのタスク。
  ユーザーが「iOSにデッキ詳細を追加」「SwiftUIでメモ一覧を作って」「iPhoneアプリの復習画面を実装」等と指示し、新しい feature ディレクトリまたは主要画面を作る場合、書き始める前にこの skill を必ず起動すること。
  やること: docs/12_ios_design.md と docs/03_api_specification.md に従い、View + Model/DTO + Service の構成、Bearer Token API、loading/empty/error、Swift 6 concurrency、xcodebuild検証まで含めて実装する。
  使わない場合: 既存 iOS feature の小規模修正、文言変更、docs/config-only変更。
---

# iOS New Feature Skill

新しい iOS feature を SwiftUI + 既存 Laravel API クライアント上に追加する。

## 前提ドキュメント

- `docs/12_ios_design.md`
- `docs/03_api_specification.md`
- `AGENTS.md`

## 実装フロー

1. API仕様を確認する。
   - endpoint, method, request body, response envelope, status code, validation error を確認。
   - Backend APIが足りない場合は勝手にiOSだけで回避しない。Backend変更が必要なら `api-*` skill の対象か判断する。
2. 配置を決める。
   - `ios/ManaMemoAI/Features/<FeatureName>/`
   - 既存 feature に収まるなら新規featureを作らない。
3. Swiftファイルを作る。
   - `<Domain>Models.swift`: response DTO / request DTO
   - `<Domain>Service.swift`: APIClient を使う API 呼び出し
   - `<Screen>View.swift`: SwiftUI view
4. UI状態を実装する。
   - loading / empty / error / success を必ず扱う。
   - 入力フォームは disabled 条件と送信中表示を持つ。
5. 依存接続を行う。
   - `AuthSessionStore` など既存 composition point に service factory を追加。
   - 画面遷移元を最小限に更新。
6. Xcode project にファイルを登録する。
   - `.xcodeproj/project.pbxproj` の `PBXFileReference`, `PBXBuildFile`, `PBXSourcesBuildPhase`, group を更新。
7. 検証する。

```bash
xcodebuild -project ios/ManaMemoAI.xcodeproj -scheme ManaMemoAI -destination generic/platform=iOS -derivedDataPath /private/tmp/ManaMemoAI-DerivedData CODE_SIGNING_ALLOWED=NO build
```

## 実装ルール

- `APIClient` 以外で `URLSession` を直接使わない。
- token は Keychain のみ。`UserDefaults` に保存しない。
- API response は `APIEnvelope<T>` を使う。
- Swift 6 strict concurrency に通るよう、UI-facing service/store は `@MainActor` を基本にする。
- `#Preview` macro はCLI buildを壊す環境があるため、追加する場合は必ずCLI buildで確認する。
- 表示文字列は初期はView内でよいが、同じ文言が増えたら feature-local constants に切り出す。

## セルフチェック

- [ ] `docs/03_api_specification.md` とDTOが一致している
- [ ] loading / empty / error がある
- [ ] token付きAPI呼び出しになっている
- [ ] feature間の直接依存を増やしていない
- [ ] xcodebuild が通る
