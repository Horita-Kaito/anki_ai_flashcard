import SwiftUI

struct CardEditView: View {
    @Environment(\.dismiss) private var dismiss
    let card: LocalCard
    let deckName: String

    @State private var question: String
    @State private var answer: String
    @State private var explanation: String
    @State private var isSuspended: Bool
    @State private var isDiscardConfirmPresented = false

    // 入力欄の最小高さは Dynamic Type に追従させる。
    @ScaledMetric(relativeTo: .body) private var questionHeight: CGFloat = 120
    @ScaledMetric(relativeTo: .body) private var answerHeight: CGFloat = 150
    @ScaledMetric(relativeTo: .body) private var explanationHeight: CGFloat = 96

    init(card: LocalCard, deckName: String) {
        self.card = card
        self.deckName = deckName
        _question = State(initialValue: card.question)
        _answer = State(initialValue: card.answer)
        _explanation = State(initialValue: card.explanation ?? "")
        _isSuspended = State(initialValue: card.isSuspended)
    }

    var body: some View {
        Form {
            Section("デッキ") {
                LabeledContent("保存先", value: deckName)
            }

            Section("表") {
                TextEditor(text: $question)
                    .frame(minHeight: questionHeight)
            }

            Section("裏") {
                TextEditor(text: $answer)
                    .frame(minHeight: answerHeight)
            }

            Section("補足") {
                TextEditor(text: $explanation)
                    .frame(minHeight: explanationHeight)
            }

            Section("復習状態") {
                LabeledContent("次回", value: card.dueAt.formatted(date: .numeric, time: .shortened))
                LabeledContent("反復", value: "\(card.repetitions)")
                LabeledContent("間隔", value: "\(card.intervalDays) 日")
                LabeledContent("失敗", value: "\(card.lapseCount)")
            }

            Section {
                Toggle("復習を一時停止", isOn: $isSuspended)
            } footer: {
                Text("一時停止すると、このカードは復習に出題されません。")
            }
        }
        .navigationTitle("カード編集")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    attemptDismiss()
                } label: {
                    Label("戻る", systemImage: "chevron.backward")
                }
            }

            ToolbarItem(placement: .confirmationAction) {
                Button("保存") {
                    save()
                }
                .disabled(!canSave)
            }
        }
        .confirmationDialog(
            "変更を破棄しますか？",
            isPresented: $isDiscardConfirmPresented,
            titleVisibility: .visible
        ) {
            Button("変更を破棄", role: .destructive) {
                dismiss()
            }
            Button("編集を続ける", role: .cancel) {}
        } message: {
            Text("保存していない変更は失われます。")
        }
    }

    private var canSave: Bool {
        !question.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !answer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    // 編集内容が元のカードと変わっているか。戻る操作時の破棄確認に使う。
    private var hasChanges: Bool {
        question != card.question
            || answer != card.answer
            || explanation != (card.explanation ?? "")
            || isSuspended != card.isSuspended
    }

    private func attemptDismiss() {
        if hasChanges {
            isDiscardConfirmPresented = true
        } else {
            dismiss()
        }
    }

    private func save() {
        card.question = question.trimmingCharacters(in: .whitespacesAndNewlines)
        card.answer = answer.trimmingCharacters(in: .whitespacesAndNewlines)
        card.explanation = normalizedExplanation
        card.isSuspended = isSuspended
        card.markDirty()
        Haptics.success()
        dismiss()
    }

    private var normalizedExplanation: String? {
        let value = explanation.trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }
}
