import SwiftUI
import SwiftData

struct DeckListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \LocalDeck.displayOrder) private var decks: [LocalDeck]

    var body: some View {
        NavigationStack {
            List {
                if decks.isEmpty {
                ContentUnavailableView(
                    "デッキがありません",
                    systemImage: "rectangle.stack",
                    description: Text("右上の追加ボタンでローカルデッキを作成できます。")
                )
                } else {
                    ForEach(decks) { deck in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(deck.name)
                                .font(.headline)

                            if let description = deck.deckDescription, !description.isEmpty {
                                Text(description)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(2)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .navigationTitle("デッキ")
            .toolbar {
                Button {
                    createDeck()
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
    }

    private func createDeck() {
        let deck = LocalDeck(name: "新しいデッキ", displayOrder: decks.count)
        modelContext.insert(deck)
    }
}
