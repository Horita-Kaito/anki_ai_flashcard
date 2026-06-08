import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var session: AuthSessionStore
    let user: User

    var body: some View {
        NavigationStack {
            List {
                Section("アカウント") {
                    LabeledContent("名前", value: user.name)
                    LabeledContent("メール", value: user.email)
                }

                Section("次に実装する画面") {
                    NavigationLink("デッキ一覧") {
                        DeckListView()
                    }
                    NavigationLink("メモ作成") {
                        NoteCreateView()
                    }
                    NavigationLink("復習") {
                        PlaceholderView(title: "復習")
                    }
                }

                Section {
                    Button("ログアウト", role: .destructive) {
                        Task {
                            await session.logout()
                        }
                    }
                }
            }
            .navigationTitle("ホーム")
        }
    }
}

private struct PlaceholderView: View {
    let title: String

    var body: some View {
        ContentUnavailableView(title, systemImage: "hammer")
            .navigationTitle(title)
    }
}
