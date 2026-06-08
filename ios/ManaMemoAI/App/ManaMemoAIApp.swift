import SwiftUI
import SwiftData

@main
struct ManaMemoAIApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
        .modelContainer(for: [
            LocalDeck.self,
            LocalNoteSeed.self,
            LocalAiCardCandidate.self,
            LocalCard.self
        ])
    }
}
