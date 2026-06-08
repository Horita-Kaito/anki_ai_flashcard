import SwiftUI
import SwiftData

struct ReviewView: View {
    @Query(sort: \LocalCard.dueAt) private var cards: [LocalCard]
    @State private var currentIndex = 0
    @State private var isAnswerVisible = false
    @State private var completedCount = 0

    private var dueCards: [LocalCard] {
        cards.filter { $0.dueAt <= .now }
    }

    private var currentCard: LocalCard? {
        guard currentIndex < dueCards.count else {
            return nil
        }

        return dueCards[currentIndex]
    }

    var body: some View {
        NavigationStack {
            Group {
                if cards.isEmpty {
                    ContentUnavailableView(
                        "カードがありません",
                        systemImage: "rectangle.on.rectangle",
                        description: Text("AI候補を採用すると復習カードになります。")
                    )
                } else if let currentCard {
                    reviewContent(for: currentCard)
                } else {
                    ContentUnavailableView(
                        "今日の復習は完了です",
                        systemImage: "checkmark.circle",
                        description: Text("完了: \(completedCount) 枚")
                    )
                }
            }
            .navigationTitle("復習")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Text("\(min(currentIndex + 1, dueCards.count))/\(dueCards.count)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private func reviewContent(for card: LocalCard) -> some View {
        VStack(spacing: 18) {
            VStack(alignment: .leading, spacing: 12) {
                Text("表")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Text(card.question)
                    .font(.title3.weight(.semibold))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .textSelection(.enabled)
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.thinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 12))

            if isAnswerVisible {
                VStack(alignment: .leading, spacing: 12) {
                    Text("裏")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Text(card.answer)
                        .font(.body)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .textSelection(.enabled)

                    if let explanation = card.explanation, !explanation.isEmpty {
                        Divider()
                        Text(explanation)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(.background)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(.quaternary)
                )

                ratingGrid(for: card)
            } else {
                Button {
                    isAnswerVisible = true
                } label: {
                    Label("答えを見る", systemImage: "eye")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            }

            Spacer()
        }
        .padding()
    }

    private func ratingGrid(for card: LocalCard) -> some View {
        Grid(horizontalSpacing: 10, verticalSpacing: 10) {
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
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(.bordered)
        .controlSize(.large)
    }

    private func rate(_ card: LocalCard, as rating: ReviewRating) {
        ReviewScheduler.apply(rating, to: card)
        completedCount += 1
        isAnswerVisible = false

        if currentIndex < dueCards.count {
            currentIndex = min(currentIndex, dueCards.count)
        }
    }
}
