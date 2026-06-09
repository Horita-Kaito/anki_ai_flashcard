import SwiftUI

struct RootView: View {
    // 初回起動時のみオンボーディングを表示する。完了状態は端末内に保存する。
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false

    var body: some View {
        if hasCompletedOnboarding {
            HomeView()
        } else {
            OnboardingView {
                hasCompletedOnboarding = true
            }
        }
    }
}
