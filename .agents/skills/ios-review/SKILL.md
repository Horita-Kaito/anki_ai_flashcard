---
name: ios-review
description: |
  **必ず使用する条件**: ios/ 配下の Swift / SwiftUI コードを新規作成または大きく修正した後、コミット/PR 前に必ずこの skill を起動してセルフレビューする。ユーザーが「iOSをレビューして」「Swift側をチェックして」「コミット前に確認」等と指示した場合も起動する。
  やること: docs/12_ios_design.md と docs/03_api_specification.md に従い、API整合、認証/Keychain、Swift concurrency、SwiftUI状態、Navigation、エラー表示、Xcode project登録、xcodebuild検証を確認し、Critical/Recommended に分類して報告する。
  使わない場合: Backend のレビューは api-review、Web frontend のレビューは ui-review を使う。
---

# iOS Review Skill

`ios/` 配下の SwiftUI アプリコードをレビューする。

## 前提ドキュメント

- `docs/12_ios_design.md`
- `docs/03_api_specification.md`
- `docs/07_testing_strategy.md`

## レビュー観点

### 1. API整合
- endpoint/method/request/response が `docs/03_api_specification.md` と一致している
- `APIEnvelope<T>` / `EmptyResponse` の使い分けが正しい
- snake_case / ISO 8601 date の decode 方針に合っている
- validation/error response を user-facing に扱っている

### 2. 認証とセキュリティ
- iOSは Bearer Token flow を使っている
- token は Keychain 保存で、`UserDefaults` に保存していない
- logout で current token revoke と local delete を行う
- API key / real env / secret をコミットしていない

### 3. Swift Concurrency
- Swift 6 strict concurrency で通る
- UI state 更新は MainActor 上で行う
- `@unchecked Sendable` や actor isolation 回避がない

### 4. SwiftUI状態設計
- loading / empty / error / success がある
- 送信中の多重submitを防いでいる
- NavigationStack / toolbar / Form / List の使い方が自然
- 片手操作・iPhone画面幅で破綻しない

### 5. レイヤーと配置
- `App`, `Core`, `Features`, `Shared` の責務に従っている
- feature 間の直接依存を増やしていない
- `APIClient` 以外で URLSession を直接使っていない
- Keychain 実装が `Core/Keychain` に閉じている

### 6. Xcode project
- 新規Swiftファイルが `.xcodeproj/project.pbxproj` に登録されている
- 不要な DerivedData / xcuserdata / build artifact がコミット対象になっていない
- Debug-only HTTP例外がReleaseに漏れていないか確認している

### 7. 検証
- `xcodebuild ... CODE_SIGNING_ALLOWED=NO build` が通る
- Backend変更を伴う場合は関連PHPUnitも通る
- 実機確認が必要な項目は明示されている

## 出力形式

```text
# iOSレビュー結果: <path>

## 観点別評価
### 1. API整合 — Pass / Issue
- ...

...

## 総合評価: S / A / B / C / D

## Critical
1. ...

## Recommended
1. ...
```

Critical がある場合はコミット前に修正する。
