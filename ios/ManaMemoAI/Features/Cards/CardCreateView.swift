import SwiftUI
import SwiftData

/// デッキに手動でカードを追加する画面。AI候補の採用を経由せずにカードを作れる。
struct CardCreateView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \LocalDeck.displayOrder) private var decks: [LocalDeck]

    @State private var selectedDeckId: UUID?
    @State private var question = ""
    @State private var answer = ""
    @State private var explanation = ""

    @ScaledMetric(relativeTo: .body) private var questionHeight: CGFloat = 96
    @ScaledMetric(relativeTo: .body) private var answerHeight: CGFloat = 132
    @ScaledMetric(relativeTo: .body) private var explanationHeight: CGFloat = 88

    var body: some View {
        NavigationStack {
            Form {
                Section("デッキ") {
                    if decks.isEmpty {
                        ContentUnavailableView(
                            "デッキがありません",
                            systemImage: "rectangle.stack",
                            description: Text("「標準デッキ」を自動作成して保存します。")
                        )
                    } else {
                        Picker("デッキ", selection: $selectedDeckId) {
                            ForEach(indentedDecks(decks)) { option in
                                Text(option.indentedName).tag(UUID?.some(option.deck.id))
                            }
                        }
                    }
                }

                Section("カード表面") {
                    TextEditor(text: $question)
                        .frame(minHeight: questionHeight)
                }

                Section("カード裏面") {
                    TextEditor(text: $answer)
                        .frame(minHeight: answerHeight)
                }

                Section("補足") {
                    TextEditor(text: $explanation)
                        .frame(minHeight: explanationHeight)
                }
            }
            .navigationTitle("カードを作成")
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
                    .disabled(!canSubmit)
                }
            }
            .task {
                ensureDefaultDeck()
            }
        }
    }

    private var canSubmit: Bool {
        selectedDeckId != nil
            && !question.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !answer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private func ensureDefaultDeck() {
        selectedDeckId = ensureDefaultDeck(in: decks, context: modelContext, currentSelection: selectedDeckId)
    }

    private func create() {
        guard let selectedDeckId else {
            return
        }

        let card = LocalCard(
            deckId: selectedDeckId,
            question: question.trimmingCharacters(in: .whitespacesAndNewlines),
            answer: answer.trimmingCharacters(in: .whitespacesAndNewlines),
            explanation: normalizedExplanation
        )
        modelContext.insert(card)
        Haptics.success()
        dismiss()
    }

    private var normalizedExplanation: String? {
        let value = explanation.trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }
}
