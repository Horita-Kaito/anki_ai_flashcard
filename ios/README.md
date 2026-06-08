# ManaMemoAI iOS

SwiftUI client for the existing Laravel API.

## Requirements

- Xcode 16.4+
- iOS 17.0+
- Existing backend running from the repository root

## Open

Open `ios/ManaMemoAI.xcodeproj` in Xcode and select the `ManaMemoAI` scheme.

## API URL

The Debug build default is:

```text
http://127.0.0.1:8000/api/v1
```

That works for many Simulator flows. For a physical iPhone, use the Mac LAN IP instead:

```text
http://192.168.x.x:8000/api/v1
```

Change this in Xcode:

```text
ManaMemoAI target -> Build Settings -> User-Defined -> API_BASE_URL
```

Debug builds allow HTTP and local network access for development. Release builds should use HTTPS.

## Backend Auth

The app uses the existing native-client Sanctum flow:

- `POST /api/v1/tokens`
- Store the returned token in Keychain
- Send `Authorization: Bearer <token>`
- `DELETE /api/v1/tokens/current` on logout

## CLI Build Check

Code-only build without signing:

```bash
xcodebuild -project ios/ManaMemoAI.xcodeproj -scheme ManaMemoAI -destination generic/platform=iOS -derivedDataPath /private/tmp/ManaMemoAI-DerivedData CODE_SIGNING_ALLOWED=NO build
```

For real device or TestFlight builds, set the Apple development team in Xcode Signing & Capabilities.
