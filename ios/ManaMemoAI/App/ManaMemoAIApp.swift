import SwiftUI

@main
struct ManaMemoAIApp: App {
    @StateObject private var session = AuthSessionStore.bootstrap()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(session)
        }
    }
}
