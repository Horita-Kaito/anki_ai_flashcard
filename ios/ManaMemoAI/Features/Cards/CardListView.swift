import SwiftUI
import SwiftData

struct CardListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \LocalCard.updatedAt, order: .reverse) private var cards: [LocalCard]
    @Query private var decks: [LocalDeck]
    @State private var searchText = ""

    private var filteredCards: [LocalCard] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else {
            return cards
        }

        return cards.filter {
            $0.question.localizedCaseInsensitiveContains(query)
                || $0.answer.localizedCaseInsensitiveContains(query)
                || ($0.explanation?.localizedCaseInsensitiveContains(query) ?? false)
        }
    }

    var body: some View {
        NavigationStack {
            List {
                if cards.isEmpty {
                    ContentUnavailableView(
                        "カードがありません",
                        systemImage: "rectangle.on.rectangle",
                        description: Text("AI候補を採用するとここに表示されます。")
                    )
                } else if filteredCards.isEmpty {
                    ContentUnavailableView.search(text: searchText)
                } else {
                    ForEach(filteredCards) { card in
                        NavigationLink {
                            CardEditView(card: card, deckName: deckName(for: card.deckId))
                        } label: {
                            CardRow(card: card, deckName: deckName(for: card.deckId))
                        }
                    }
                    .onDelete(perform: delete)
                }
            }
            .navigationTitle("カード")
            .searchable(text: $searchText, prompt: "カードを検索")
        }
    }

    private func deckName(for deckId: UUID) -> String {
        decks.first { $0.id == deckId }?.name ?? "未分類"
    }

    private func delete(offsets: IndexSet) {
        for offset in offsets {
            modelContext.delete(filteredCards[offset])
        }
    }
}

private struct CardRow: View {
    let card: LocalCard
    let deckName: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(card.question)
                .font(.headline)
                .lineLimit(2)

            Text(card.answer)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(2)

            HStack(spacing: 10) {
                Label(deckName, systemImage: "rectangle.stack")
                Label(dueLabel, systemImage: "calendar")
                Label("\(card.repetitions)", systemImage: "repeat")
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 6)
    }

    private var dueLabel: String {
        if card.dueAt <= .now {
            return "復習対象"
        }

        return card.dueAt.formatted(date: .numeric, time: .omitted)
    }
}
