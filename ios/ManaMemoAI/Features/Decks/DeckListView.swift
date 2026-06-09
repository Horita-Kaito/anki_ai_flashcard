import SwiftUI
import SwiftData

struct DeckListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \LocalDeck.displayOrder) private var decks: [LocalDeck]
    @Query private var cards: [LocalCard]
    @State private var isCreatePresented = false

    // 親子関係から表示用のツリーを組み立てる。nil 親＝トップレベル。
    private var deckTree: [DeckNode] {
        nodes(forParent: nil)
    }

    private func nodes(forParent parent: UUID?) -> [DeckNode] {
        decks
            .filter { $0.parentDeckId == parent }
            .sorted { $0.displayOrder < $1.displayOrder }
            .map { deck in
                let children = nodes(forParent: deck.id)
                return DeckNode(deck: deck, children: children.isEmpty ? nil : children)
            }
    }

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
                    Section {
                        OutlineGroup(deckTree, children: \.children) { node in
                            NavigationLink {
                                DeckEditView(
                                    deck: node.deck,
                                    cardCount: cardCount(for: node.deck),
                                    allDecks: decks
                                )
                            } label: {
                                DeckRow(
                                    deck: node.deck,
                                    cardCount: cardCount(for: node.deck),
                                    childCount: node.children?.count ?? 0
                                )
                            }
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    deleteDeck(node.deck)
                                } label: {
                                    Label("削除", systemImage: "trash")
                                }
                            }
                        }
                    } header: {
                        Text("\(decks.count) 件")
                    }
                }
            }
            .navigationTitle("デッキ")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        isCreatePresented = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("デッキを追加")
                }
            }
            .sheet(isPresented: $isCreatePresented) {
                NavigationStack {
                    DeckCreateView(displayOrder: decks.count, decks: decks)
                }
            }
        }
    }

    private func cardCount(for deck: LocalDeck) -> Int {
        cards.filter { $0.deckId == deck.id }.count
    }

    // デッキ削除は非破壊：カードは残し（所属が消えると一覧では「未分類」）、
    // 子デッキは削除デッキの親へ繰り上げて階層を保つ。
    private func deleteDeck(_ deck: LocalDeck) {
        for child in decks where child.parentDeckId == deck.id {
            child.parentDeckId = deck.parentDeckId
            child.markDirty()
        }
        modelContext.deleteTracked(entity: SyncEntity.decks, clientId: deck.id, model: deck)
    }
}

/// 階層表示用のノード。OutlineGroup の children に渡す。
private struct DeckNode: Identifiable {
    let deck: LocalDeck
    var children: [DeckNode]?
    var id: UUID { deck.id }
}

private struct DeckRow: View {
    let deck: LocalDeck
    let cardCount: Int
    var childCount: Int = 0

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text(deck.name)
                .font(.headline)

            if let description = deck.deckDescription, !description.isEmpty {
                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(AppColor.secondaryText)
                    .lineLimit(2)
            }

            HStack(spacing: AppSpacing.md) {
                Label("\(cardCount) 枚", systemImage: "rectangle.on.rectangle")
                if childCount > 0 {
                    Label("\(childCount) 個のサブデッキ", systemImage: "folder")
                }
            }
            .metadataStyle()
        }
        .padding(.vertical, AppSpacing.xs)
        .accessibilityElement(children: .combine)
    }
}

/// デッキ詳細内に表示する、そのデッキのカード行（読み取り専用）。
private struct DeckCardRow: View {
    let card: LocalCard

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            Text(card.question)
                .lineLimit(1)

            if card.isSuspended {
                Label("停止中", systemImage: "pause.circle")
                    .font(.caption)
                    .foregroundStyle(AppColor.warning)
            } else if card.dueAt <= .now {
                Label("復習対象", systemImage: "calendar")
                    .font(.caption)
                    .foregroundStyle(AppColor.accent)
            } else {
                Text(card.dueAt.formatted(date: .numeric, time: .omitted))
                    .metadataStyle()
            }
        }
        .accessibilityElement(children: .combine)
    }
}

private struct DeckCreateView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    let displayOrder: Int
    let decks: [LocalDeck]

    @State private var name = ""
    @State private var deckDescription = ""
    @State private var parentDeckId: UUID?

    var body: some View {
        Form {
            Section("デッキ名") {
                TextField("デッキ名", text: $name)
            }

            Section("説明（任意）") {
                TextField("説明", text: $deckDescription, axis: .vertical)
                    .lineLimit(1...4)
            }

            Section("親デッキ（任意）") {
                ParentDeckPicker(options: indentedDecks(decks), selection: $parentDeckId)
            }
        }
        .navigationTitle("デッキ作成")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("閉じる") {
                    dismiss()
                }
            }

            ToolbarItem(placement: .confirmationAction) {
                Button("作成") {
                    create()
                }
                .disabled(trimmedName.isEmpty)
            }
        }
    }

    private var trimmedName: String {
        name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func create() {
        let deck = LocalDeck(
            name: trimmedName,
            deckDescription: normalizedDescription,
            displayOrder: displayOrder,
            parentDeckId: parentDeckId
        )
        modelContext.insert(deck)
        Haptics.success()
        dismiss()
    }

    private var normalizedDescription: String? {
        let value = deckDescription.trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }
}

private struct DeckEditView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Query private var allCards: [LocalCard]
    let deck: LocalDeck
    let cardCount: Int
    let allDecks: [LocalDeck]

    @State private var name: String
    @State private var deckDescription: String
    @State private var parentDeckId: UUID?
    @State private var isDeleteConfirmPresented = false

    private var deckCards: [LocalCard] {
        allCards
            .filter { $0.deckId == deck.id }
            .sorted { $0.dueAt < $1.dueAt }
    }

    init(deck: LocalDeck, cardCount: Int, allDecks: [LocalDeck]) {
        self.deck = deck
        self.cardCount = cardCount
        self.allDecks = allDecks
        _name = State(initialValue: deck.name)
        _deckDescription = State(initialValue: deck.deckDescription ?? "")
        _parentDeckId = State(initialValue: deck.parentDeckId)
    }

    var body: some View {
        Form {
            Section("デッキ名") {
                TextField("デッキ名", text: $name)
            }

            Section("説明（任意）") {
                TextField("説明", text: $deckDescription, axis: .vertical)
                    .lineLimit(1...4)
            }

            Section("親デッキ（任意）") {
                // 自分自身と子孫は循環するため候補から除外する。
                ParentDeckPicker(
                    options: indentedDecks(allDecks, excluding: deck.id),
                    selection: $parentDeckId
                )
            }

            Section {
                if deckCards.isEmpty {
                    Text("カードがありません")
                        .foregroundStyle(AppColor.secondaryText)
                } else {
                    ForEach(deckCards) { card in
                        DeckCardRow(card: card)
                    }
                }
            } header: {
                Text("カード")
            } footer: {
                Text("\(deckCards.count) 枚")
            }

            Section {
                Button("デッキを削除", role: .destructive) {
                    isDeleteConfirmPresented = true
                }
            }
        }
        .navigationTitle("デッキ編集")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("保存") {
                    save()
                }
                .disabled(trimmedName.isEmpty)
            }
        }
        .confirmationDialog(
            "このデッキを削除しますか？",
            isPresented: $isDeleteConfirmPresented,
            titleVisibility: .visible
        ) {
            Button("削除", role: .destructive) {
                delete()
            }
            Button("キャンセル", role: .cancel) {}
        } message: {
            if cardCount > 0 {
                Text("カード \(cardCount) 枚はデッキ未分類として残ります。")
            }
        }
    }

    private var trimmedName: String {
        name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func save() {
        deck.name = trimmedName
        deck.deckDescription = normalizedDescription
        deck.parentDeckId = parentDeckId
        deck.markDirty()
        Haptics.success()
        dismiss()
    }

    private func delete() {
        // 子デッキは削除デッキの親へ繰り上げる。
        for child in allDecks where child.parentDeckId == deck.id {
            child.parentDeckId = deck.parentDeckId
            child.markDirty()
        }
        modelContext.deleteTracked(entity: SyncEntity.decks, clientId: deck.id, model: deck)
        dismiss()
    }

    private var normalizedDescription: String? {
        let value = deckDescription.trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }
}

/// 親デッキを選ぶピッカー。「なし（トップ）」＋インデント付きのデッキ候補。
private struct ParentDeckPicker: View {
    let options: [IndentedDeck]
    @Binding var selection: UUID?

    var body: some View {
        Picker("親デッキ", selection: $selection) {
            Text("なし（トップ）").tag(UUID?.none)
            ForEach(options) { option in
                Text(option.indentedName).tag(UUID?.some(option.deck.id))
            }
        }
    }
}
