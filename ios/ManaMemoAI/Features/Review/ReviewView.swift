import SwiftUI
import SwiftData

struct ReviewView: View {
    @Query(sort: \LocalCard.dueAt) private var cards: [LocalCard]
    @Query(sort: \LocalDeck.displayOrder) private var decks: [LocalDeck]
    // セッション開始時点の復習対象を固定スナップショットとして保持する。
    // 採点で dueAt が未来に移動しても分母が変動せず、進捗表示が安定する。
    @State private var queue: [LocalCard] = []
    @State private var currentIndex = 0
    @State private var isAnswerVisible = false
    @State private var completedCount = 0
    @State private var hasLoaded = false
    // 復習対象を絞り込むデッキ。nil は全デッキ。選択時は子孫デッキも含める。
    @State private var deckFilter: UUID?

    private var currentCard: LocalCard? {
        guard currentIndex < queue.count else {
            return nil
        }

        return queue[currentIndex]
    }

    // 絞り込みデッキとその全子孫の id 集合（nil は絞り込みなし）。
    private var scopedDeckIds: Set<UUID>? {
        guard let deckFilter else { return nil }
        var ids: Set<UUID> = [deckFilter]
        var frontier = [deckFilter]
        while let current = frontier.popLast() {
            for deck in decks where deck.parentDeckId == current {
                if ids.insert(deck.id).inserted {
                    frontier.append(deck.id)
                }
            }
        }
        return ids
    }

    private var scopedCards: [LocalCard] {
        guard let scopedDeckIds else { return cards }
        return cards.filter { scopedDeckIds.contains($0.deckId) }
    }

    var body: some View {
        NavigationStack {
            Group {
                if scopedCards.isEmpty {
                    ContentUnavailableView(
                        "カードがありません",
                        systemImage: "rectangle.on.rectangle",
                        description: Text(deckFilter == nil
                            ? "AI候補を採用すると復習カードになります。"
                            : "このデッキには復習カードがありません。")
                    )
                } else if let currentCard {
                    reviewContent(for: currentCard)
                } else {
                    completionView
                }
            }
            .navigationTitle("復習")
            .toolbar {
                if !decks.isEmpty {
                    ToolbarItem(placement: .topBarLeading) {
                        deckFilterMenu
                    }
                }

                if !queue.isEmpty {
                    ToolbarItem(placement: .topBarTrailing) {
                        Text("\(min(currentIndex + 1, queue.count))/\(queue.count)")
                            .metadataStyle()
                            .accessibilityLabel(Text("\(queue.count) 枚中 \(min(currentIndex + 1, queue.count)) 枚目"))
                    }
                }
            }
            .onAppear(perform: loadQueueIfNeeded)
            .onChange(of: deckFilter) { reloadQueue() }
        }
    }

    private var deckFilterMenu: some View {
        Menu {
            Picker("デッキで絞り込む", selection: $deckFilter) {
                Text("すべてのデッキ").tag(UUID?.none)
                ForEach(filterOptions) { option in
                    Text(option.name).tag(UUID?.some(option.id))
                }
            }
        } label: {
            Label(filterLabel, systemImage: "line.3.horizontal.decrease.circle")
        }
        .accessibilityLabel("デッキで絞り込む")
    }

    private struct FilterOption: Identifiable {
        let id: UUID
        let name: String
    }

    // デッキをツリー順に並べた絞り込み候補（インデント付き）。
    private var filterOptions: [FilterOption] {
        func build(parent: UUID?, depth: Int) -> [FilterOption] {
            decks
                .filter { $0.parentDeckId == parent }
                .sorted { $0.displayOrder < $1.displayOrder }
                .flatMap { deck in
                    [FilterOption(id: deck.id, name: String(repeating: "　", count: depth) + deck.name)]
                        + build(parent: deck.id, depth: depth + 1)
                }
        }
        return build(parent: nil, depth: 0)
    }

    private var filterLabel: String {
        guard let deckFilter, let deck = decks.first(where: { $0.id == deckFilter }) else {
            return String(localized: "すべて")
        }
        return deck.name
    }

    private var completionView: some View {
        ContentUnavailableView {
            Label("今日の復習は完了です", systemImage: "checkmark.circle")
        } description: {
            Text("完了: \(completedCount) 枚")
        } actions: {
            Button("もう一度復習する", action: reloadQueue)
                .buttonStyle(.secondaryAction)
                .padding(.horizontal, AppSpacing.xl)
        }
    }

    private func loadQueueIfNeeded() {
        guard !hasLoaded else {
            return
        }

        reloadQueue()
        hasLoaded = true
    }

    private func reloadQueue() {
        queue = scopedCards.filter { $0.dueAt <= .now }
        currentIndex = 0
        completedCount = 0
        isAnswerVisible = false
    }

    private func reviewContent(for card: LocalCard) -> some View {
        VStack(spacing: AppSpacing.xl) {
            VStack(alignment: .leading, spacing: AppSpacing.md) {
                Text("表")
                    .eyebrowStyle()

                Text(card.question)
                    .appTitle()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .textSelection(.enabled)
            }
            .cardSurface()

            if isAnswerVisible {
                VStack(alignment: .leading, spacing: AppSpacing.md) {
                    Text("裏")
                        .eyebrowStyle()

                    Text(card.answer)
                        .appBody()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .textSelection(.enabled)

                    if let explanation = card.explanation, !explanation.isEmpty {
                        Divider()
                        Text(explanation)
                            .appFootnote()
                            .foregroundStyle(AppColor.secondaryText)
                    }
                }
                .cardSurface(material: .regularMaterial, bordered: true)
                .transition(.move(edge: .bottom).combined(with: .opacity))

                ratingGrid(for: card)
                    .transition(.opacity)
            } else {
                Button(action: revealAnswer) {
                    Label("答えを見る", systemImage: "eye")
                }
                .buttonStyle(.primaryAction)
            }

            Spacer()
        }
        .padding()
        .animation(.snappy(duration: 0.28), value: isAnswerVisible)
    }

    private func ratingGrid(for card: LocalCard) -> some View {
        Grid(horizontalSpacing: AppSpacing.md, verticalSpacing: AppSpacing.md) {
            GridRow {
                ratingButton(.again, card: card)
                ratingButton(.hard, card: card)
            }

            GridRow {
                ratingButton(.good, card: card)
                ratingButton(.easy, card: card)
            }
        }
    }

    private func ratingButton(_ rating: ReviewRating, card: LocalCard) -> some View {
        Button {
            rate(card, as: rating)
        } label: {
            Label(rating.title, systemImage: rating.systemImage)
        }
        .buttonStyle(.secondaryAction(tint: rating.tint))
        .accessibilityLabel(Text("評価: \(rating.title)"))
    }

    private func revealAnswer() {
        Haptics.tap()
        isAnswerVisible = true
    }

    private func rate(_ card: LocalCard, as rating: ReviewRating) {
        Haptics.selection()
        ReviewScheduler.apply(rating, to: card)
        completedCount += 1
        isAnswerVisible = false
        currentIndex += 1

        // セッションの最後の1枚を採点したら完了。完了の触覚で締めくくる。
        if currentIndex >= queue.count {
            Haptics.success()
        }
    }
}

private extension ReviewRating {
    /// 評価ボタンの意味色。Again=注意、Hard=警告、Good=情報、Easy=成功。
    var tint: Color {
        switch self {
        case .again: AppColor.danger
        case .hard: AppColor.warning
        case .good: AppColor.info
        case .easy: AppColor.success
        }
    }
}
