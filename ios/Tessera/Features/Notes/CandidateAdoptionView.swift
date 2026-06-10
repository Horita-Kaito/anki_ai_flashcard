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

    // 入力欄の最小高さは Dynamic Type に追従させる。
    @ScaledMetric(relativeTo: .body) private var questionHeight: CGFloat = 96
    @ScaledMetric(relativeTo: .body) private var answerHeight: CGFloat = 132
    @ScaledMetric(relativeTo: .body) private var explanationHeight: CGFloat = 88

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
                            description: Text("「標準デッキ」を自動作成して採用します。")
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
                applyDefaultDeckSelection()
            }
        }
    }

    private var canSubmit: Bool {
        selectedDeckId != nil
            && !question.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !answer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private func applyDefaultDeckSelection() {
        selectedDeckId = ensureDefaultDeck(in: decks, context: modelContext, currentSelection: selectedDeckId)
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
        candidate.markDirty()
        onAdopted(card)
        dismiss()
    }

    private var normalizedExplanation: String? {
        let value = explanation.trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }
}
