import SwiftUI

struct CardEditView: View {
    @Environment(\.dismiss) private var dismiss
    let card: LocalCard
    let deckName: String

    @State private var question: String
    @State private var answer: String
    @State private var explanation: String

    init(card: LocalCard, deckName: String) {
        self.card = card
        self.deckName = deckName
        _question = State(initialValue: card.question)
        _answer = State(initialValue: card.answer)
        _explanation = State(initialValue: card.explanation ?? "")
    }

    var body: some View {
        Form {
            Section("デッキ") {
                LabeledContent("保存先", value: deckName)
            }

            Section("表") {
                TextEditor(text: $question)
                    .frame(minHeight: 120)
            }

            Section("裏") {
                TextEditor(text: $answer)
                    .frame(minHeight: 150)
            }

            Section("補足") {
                TextEditor(text: $explanation)
                    .frame(minHeight: 96)
            }

            Section("復習状態") {
                LabeledContent("次回", value: card.dueAt.formatted(date: .numeric, time: .shortened))
                LabeledContent("反復", value: "\(card.repetitions)")
                LabeledContent("間隔", value: "\(card.intervalDays) 日")
                LabeledContent("失敗", value: "\(card.lapseCount)")
            }
        }
        .navigationTitle("カード編集")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("保存") {
                    save()
                }
                .disabled(!canSave)
            }
        }
    }

    private var canSave: Bool {
        !question.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !answer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private func save() {
        card.question = question.trimmingCharacters(in: .whitespacesAndNewlines)
        card.answer = answer.trimmingCharacters(in: .whitespacesAndNewlines)
        card.explanation = normalizedExplanation
        card.updatedAt = .now
        dismiss()
    }

    private var normalizedExplanation: String? {
        let value = explanation.trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }
}
