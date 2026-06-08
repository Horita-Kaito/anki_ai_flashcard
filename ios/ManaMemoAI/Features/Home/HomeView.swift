import SwiftUI

struct HomeView: View {
    var body: some View {
        TabView {
            NoteListView()
                .tabItem {
                    Label("メモ", systemImage: "note.text")
                }

            DeckListView()
                .tabItem {
                    Label("デッキ", systemImage: "rectangle.stack")
                }

            NavigationStack {
                PlaceholderView(title: "復習")
            }
            .tabItem {
                Label("復習", systemImage: "checkmark.circle")
            }

            SettingsView()
                .tabItem {
                    Label("設定", systemImage: "gearshape")
                }
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
