import SwiftUI
import SwiftData

@main
struct ManaMemoAIApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    // 同期はオプトイン。通常導線はログイン不要のまま、設定からのみログインさせる。
    @StateObject private var session = AuthSessionStore.bootstrap()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(session)
                .task {
                    await session.restore()
                }
        }
        .modelContainer(for: [
            LocalDeck.self,
            LocalNoteSeed.self,
            LocalAiCardCandidate.self,
            LocalCard.self,
            LocalSyncTombstone.self
        ])
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    /// バックグラウンドDL完了でアプリが再起動された際、システムへ完了通知を返すために
    /// 完了ハンドラをダウンロードストアへ受け渡す。
    func application(
        _ application: UIApplication,
        handleEventsForBackgroundURLSession identifier: String,
        completionHandler: @escaping () -> Void
    ) {
        LocalLLMModelStore.shared.handleBackgroundSessionEvents(completionHandler: completionHandler)
    }
}
