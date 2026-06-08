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

            CardListView()
                .tabItem {
                    Label("カード", systemImage: "rectangle.on.rectangle")
                }

            ReviewView()
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
