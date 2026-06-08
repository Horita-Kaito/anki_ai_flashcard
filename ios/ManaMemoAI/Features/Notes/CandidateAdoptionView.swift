import SwiftUI
import SwiftData

struct CandidateAdoptionView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \LocalDeck.displayOrder) private var decks: [LocalDeck]

    let candidate: LocalAiCardCandidate
    let onAdopted: (LocalCard) -> Void

    @State private var selectedDeckId: UUID?
    @State private var question: String
    @State private var answer: String
    @State private var explanation: String

    init(candidate: LocalAiCardCandidate, onAdopted: @escaping (LocalCard) -> Void) {
        self.candidate = candidate
        self.onAdopted = onAdopted
        _question = State(initialValue: candidate.question)
        _answer = State(initialValue: candidate.answer)
        _explanation = State(initialValue: candidate.rationale ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("採用先") {
                    if decks.isEmpty {
                        ContentUnavailableView(
                            "デッキがありません",
                            systemImage: "rectangle.stack",
                            description: Text("標準デッキを作成します。")
                        )
                    } else {
                        Picker("デッキ", selection: $selectedDeckId) {
                            ForEach(decks) { deck in
                                Text(deck.name)
                                    .tag(Optional(deck.id))
                            }
                        }
                    }
                }

                Section("カード表面") {
                    TextEditor(text: $question)
                        .frame(minHeight: 96)
                }

                Section("カード裏面") {
                    TextEditor(text: $answer)
                        .frame(minHeight: 132)
                }

                Section("補足") {
                    TextEditor(text: $explanation)
                        .frame(minHeight: 88)
                }
            }
            .navigationTitle("カードに採用")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("閉じる") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("採用") {
                        adopt()
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
        if let firstDeck = decks.first {
            selectedDeckId = selectedDeckId ?? firstDeck.id
            return
        }

        let deck = LocalDeck(name: "標準デッキ")
        modelContext.insert(deck)
        selectedDeckId = deck.id
    }

    private func adopt() {
        guard let selectedDeckId else {
            return
        }

        let card = LocalCard(
            deckId: selectedDeckId,
            sourceNoteSeedId: candidate.noteSeedId,
            sourceAiCandidateId: candidate.id,
            question: question.trimmingCharacters(in: .whitespacesAndNewlines),
            answer: answer.trimmingCharacters(in: .whitespacesAndNewlines),
            explanation: normalizedExplanation
        )
        modelContext.insert(card)
        candidate.status = "adopted"
        candidate.updatedAt = .now
        onAdopted(card)
        dismiss()
    }

    private var normalizedExplanation: String? {
        let value = explanation.trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }
}
