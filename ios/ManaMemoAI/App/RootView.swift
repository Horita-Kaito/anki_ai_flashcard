import SwiftUI

struct RootView: View {
    @EnvironmentObject private var session: AuthSessionStore

    var body: some View {
        Group {
            switch session.state {
            case .checking:
                ProgressView()
            case .authenticated(let user):
                HomeView(user: user)
            case .signedOut:
                LoginView()
            }
        }
        .task {
            await session.restore()
        }
    }
}
