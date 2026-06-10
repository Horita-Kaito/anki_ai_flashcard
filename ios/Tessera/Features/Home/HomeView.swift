import SwiftUI
import SwiftData

struct HomeView: View {
    enum Tab: Hashable {
        case home, notes, decks, cards, review, settings
    }

    @Query private var cards: [LocalCard]
    @Query private var candidates: [LocalAiCardCandidate]
    @State private var selection: Tab = .home

    // 本日の復習対象（期限到来済み）枚数。タブのバッジに出す。
    private var dueCount: Int {
        cards.filter { $0.dueAt <= .now && !$0.isSuspended }.count
    }

    // 未確認のAI候補件数。メモタブのバッジに出す。
    private var pendingCandidateCount: Int {
        candidates.filter { $0.status == "pending" }.count
    }

    var body: some View {
        TabView(selection: $selection) {
            DashboardView(
                onStartReview: { selection = .review },
                onOpenCandidates: { selection = .notes }
            )
            .tabItem {
                Label("ホーム", systemImage: "house")
            }
            .tag(Tab.home)

            NoteListView()
                .tabItem {
                    Label("メモ", systemImage: "note.text")
                }
                .badge(pendingCandidateCount)
                .tag(Tab.notes)

            DeckListView()
                .tabItem {
                    Label("デッキ", systemImage: "rectangle.stack")
                }
                .tag(Tab.decks)

            CardListView()
                .tabItem {
                    Label("カード", systemImage: "rectangle.on.rectangle")
                }
                .tag(Tab.cards)

            ReviewView()
                .tabItem {
                    Label("復習", systemImage: "checkmark.circle")
                }
                .badge(dueCount)
                .tag(Tab.review)

            SettingsView()
                .tabItem {
                    Label("設定", systemImage: "gearshape")
                }
                .tag(Tab.settings)
        }
        .tint(AppColor.accent)
    }
}
