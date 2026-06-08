import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var session: AuthSessionStore
    let user: User

    var body: some View {
        NavigationStack {
            List {
                Section("アカウント") {
                    LabeledContent("名前", value: user.name)
                    LabeledContent("メール", value: user.email)
                }

                Section("アプリ") {
                    LabeledContent("API", value: AppConfig.apiBaseURL.absoluteString)
                }

                Section {
                    Button("ログアウト", role: .destructive) {
                        Task {
                            await session.logout()
                        }
                    }
                }
            }
            .navigationTitle("設定")
        }
    }
}
