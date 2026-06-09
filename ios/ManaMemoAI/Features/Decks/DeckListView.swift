import SwiftUI
import SwiftData

struct DeckListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \LocalDeck.displayOrder) private var decks: [LocalDeck]
    @Query private var cards: [LocalCard]
    @State private var isCreatePresented = false

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
                        ForEach(decks) { deck in
                            NavigationLink {
                                DeckEditView(deck: deck, cardCount: cardCount(for: deck))
                            } label: {
                                DeckRow(deck: deck, cardCount: cardCount(for: deck))
                            }
                        }
                        .onDelete(perform: deleteDecks)
                        .onMove(perform: moveDecks)
                    } header: {
                        Text("\(decks.count) 件")
                    }
                }
            }
            .navigationTitle("デッキ")
            .toolbar {
                if !decks.isEmpty {
                    ToolbarItem(placement: .topBarLeading) {
                        EditButton()
                    }
                }

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
                    DeckCreateView(displayOrder: decks.count)
                }
            }
        }
    }

    private func cardCount(for deck: LocalDeck) -> Int {
        cards.filter { $0.deckId == deck.id }.count
    }

    // デッキ削除は非破壊：カードは残し、所属が消えると一覧では「未分類」表示になる。
    private func deleteDecks(_ offsets: IndexSet) {
        for offset in offsets {
            let deck = decks[offset]
            modelContext.deleteTracked(entity: SyncEntity.decks, clientId: deck.id, model: deck)
        }
        normalizeDisplayOrder()
    }

    private func moveDecks(from source: IndexSet, to destination: Int) {
        var reordered = decks
        reordered.move(fromOffsets: source, toOffset: destination)
        for (index, deck) in reordered.enumerated() where deck.displayOrder != index {
            deck.displayOrder = index
            deck.markDirty()
        }
    }

    private func normalizeDisplayOrder() {
        for (index, deck) in decks.enumerated() where deck.displayOrder != index {
            deck.displayOrder = index
            deck.markDirty()
        }
    }
}

private struct DeckRow: View {
    let deck: LocalDeck
    let cardCount: Int

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

            Label("\(cardCount) 枚", systemImage: "rectangle.on.rectangle")
                .metadataStyle()
        }
        .padding(.vertical, AppSpacing.xs)
        .accessibilityElement(children: .combine)
    }
}

private struct DeckCreateView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    let displayOrder: Int

    @State private var name = ""
    @State private var deckDescription = ""

    var body: some View {
        Form {
            Section("デッキ名") {
                TextField("デッキ名", text: $name)
            }

            Section("説明（任意）") {
                TextField("説明", text: $deckDescription, axis: .vertical)
                    .lineLimit(1...4)
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
            displayOrder: displayOrder
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
    let deck: LocalDeck
    let cardCount: Int

    @State private var name: String
    @State private var deckDescription: String
    @State private var isDeleteConfirmPresented = false

    init(deck: LocalDeck, cardCount: Int) {
        self.deck = deck
        self.cardCount = cardCount
        _name = State(initialValue: deck.name)
        _deckDescription = State(initialValue: deck.deckDescription ?? "")
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

            Section("カード") {
                LabeledContent("枚数", value: "\(cardCount)")
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
        deck.markDirty()
        Haptics.success()
        dismiss()
    }

    private func delete() {
        modelContext.deleteTracked(entity: SyncEntity.decks, clientId: deck.id, model: deck)
        dismiss()
    }

    private var normalizedDescription: String? {
        let value = deckDescription.trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }
}
