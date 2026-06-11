import SwiftUI
import SwiftData

struct CardListView: View {
    enum CardSort: String, CaseIterable, Identifiable {
        case updated, due, repetitions
        var id: String { rawValue }
        var title: LocalizedStringKey {
            switch self {
            case .updated: "更新順"
            case .due: "期限順"
            case .repetitions: "反復順"
            }
        }
    }

    enum CardScope: String, CaseIterable, Identifiable {
        case all, due, suspended
        var id: String { rawValue }
        var title: LocalizedStringKey {
            switch self {
            case .all: "すべて"
            case .due: "復習対象のみ"
            case .suspended: "停止中のみ"
            }
        }
    }

    @Environment(\.modelContext) private var modelContext
    @Query(sort: \LocalCard.updatedAt, order: .reverse) private var cards: [LocalCard]
    @Query private var decks: [LocalDeck]
    @State private var searchText = ""
    @State private var sortOrder: CardSort = .updated
    @State private var scope: CardScope = .all
    @State private var isCreatePresented = false

    private var visibleCards: [LocalCard] {
        var result = cards

        switch scope {
        case .all:
            break
        case .due:
            result = result.filter { $0.dueAt <= .now && !$0.isSuspended }
        case .suspended:
            result = result.filter { $0.isSuspended }
        }

        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !query.isEmpty {
            result = result.filter {
                $0.question.localizedCaseInsensitiveContains(query)
                    || $0.answer.localizedCaseInsensitiveContains(query)
                    || ($0.explanation?.localizedCaseInsensitiveContains(query) ?? false)
            }
        }

        switch sortOrder {
        case .updated:
            result.sort { $0.updatedAt > $1.updatedAt }
        case .due:
            result.sort { $0.dueAt < $1.dueAt }
        case .repetitions:
            result.sort { $0.repetitions > $1.repetitions }
        }

        return result
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
                } else if visibleCards.isEmpty {
                    if searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        ContentUnavailableView(
                            "該当するカードがありません",
                            systemImage: "line.3.horizontal.decrease.circle",
                            description: Text("表示条件を変更してください。")
                        )
                    } else {
                        ContentUnavailableView.search(text: searchText)
                    }
                } else {
                    Section {
                        ForEach(visibleCards) { card in
                            NavigationLink {
                                CardEditView(card: card, deckName: deckName(for: card.deckId))
                            } label: {
                                CardRow(card: card, deckName: deckName(for: card.deckId))
                            }
                            .swipeActions(edge: .leading) {
                                Button {
                                    toggleSuspend(card)
                                } label: {
                                    Label(
                                        card.isSuspended ? "再開" : "一時停止",
                                        systemImage: card.isSuspended ? "play" : "pause"
                                    )
                                }
                                .tint(card.isSuspended ? AppColor.success : AppColor.warning)
                            }
                        }
                        .onDelete(perform: delete)
                    } header: {
                        Text("\(visibleCards.count) 件")
                    }
                }
            }
            .navigationTitle("カード")
            .searchable(text: $searchText, prompt: "カードを検索")
            .sheet(isPresented: $isCreatePresented) {
                CardCreateView()
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        isCreatePresented = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("カードを追加")
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Picker("並び替え", selection: $sortOrder) {
                            ForEach(CardSort.allCases) { option in
                                Text(option.title).tag(option)
                            }
                        }
                        Picker("表示", selection: $scope) {
                            ForEach(CardScope.allCases) { option in
                                Text(option.title).tag(option)
                            }
                        }
                    } label: {
                        Label("並び替え・表示", systemImage: "line.3.horizontal.decrease.circle")
                    }
                }
            }
        }
    }

    private func deckName(for deckId: UUID) -> String {
        decks.first { $0.id == deckId }?.name ?? "未分類"
    }

    private func delete(offsets: IndexSet) {
        for offset in offsets {
            let card = visibleCards[offset]
            modelContext.deleteTracked(entity: SyncEntity.cards, clientId: card.id, model: card)
        }
    }

    private func toggleSuspend(_ card: LocalCard) {
        card.isSuspended.toggle()
        card.markDirty()
        Haptics.selection()
    }
}

private struct CardRow: View {
    let card: LocalCard
    let deckName: String

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text(Cloze.reveal(card.question))
                .font(.headline)
                .lineLimit(2)

            Text(card.answer)
                .font(.subheadline)
                .foregroundStyle(AppColor.secondaryText)
                .lineLimit(2)

            HStack(spacing: AppSpacing.md) {
                Label(deckName, systemImage: "rectangle.stack")
                Label(dueLabel, systemImage: "calendar")
                Label("\(card.repetitions)", systemImage: "repeat")
            }
            .metadataStyle()

            if card.isSuspended {
                Label("停止中", systemImage: "pause.circle")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(AppColor.warning)
            }
        }
        .padding(.vertical, AppSpacing.xs)
        .accessibilityElement(children: .combine)
    }

    private var dueLabel: String {
        if card.dueAt <= .now {
            return String(localized: "復習対象")
        }

        return card.dueAt.formatted(date: .numeric, time: .omitted)
    }
}
