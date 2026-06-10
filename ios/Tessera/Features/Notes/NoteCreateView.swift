import SwiftUI
import SwiftData

struct NoteCreateView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @State private var bodyText = ""
    @State private var learningGoal = ""
    @State private var savedNote: LocalNoteSeed?
    @ScaledMetric(relativeTo: .body) private var editorHeight: CGFloat = 180
    let onSaved: ((LocalNoteSeed) -> Void)?

    init(onSaved: ((LocalNoteSeed) -> Void)? = nil) {
        self.onSaved = onSaved
    }

    var body: some View {
        Form {
            Section("メモ") {
                TextEditor(text: $bodyText)
                    .frame(minHeight: editorHeight)
            }

            Section("学習目的（任意）") {
                TextField("学習目的", text: $learningGoal, axis: .vertical)
                    .lineLimit(1...3)
            }

            if let savedNote {
                Section {
                    ContentUnavailableView(
                        "保存しました",
                        systemImage: "checkmark.circle",
                        description: Text(savedNote.body)
                    )
                }
            }

            Section {
                Button("保存", action: save)
                    .buttonStyle(.primaryAction)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                    .disabled(trimmedBody.isEmpty)
            }
        }
        .navigationTitle("メモ作成")
        .toolbar {
            if onSaved != nil {
                ToolbarItem(placement: .cancellationAction) {
                    Button("閉じる") {
                        dismiss()
                    }
                }
            }
        }
    }

    private func save() {
        let note = LocalNoteSeed(
            body: bodyText.trimmingCharacters(in: .whitespacesAndNewlines),
            learningGoal: normalizedLearningGoal
        )
        modelContext.insert(note)
        savedNote = note
        Haptics.success()
        bodyText = ""
        learningGoal = ""
        onSaved?(note)
    }

    private var trimmedBody: String {
        bodyText.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var normalizedLearningGoal: String? {
        let value = learningGoal.trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }
}
