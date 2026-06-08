import SwiftUI

struct NoteCreateView: View {
    @EnvironmentObject private var session: AuthSessionStore
    @Environment(\.dismiss) private var dismiss
    @State private var bodyText = ""
    @State private var learningGoal = ""
    @State private var isSubmitting = false
    @State private var errorMessage: String?
    @State private var savedNote: NoteSeed?
    let onSaved: ((NoteSeed) -> Void)?

    init(onSaved: ((NoteSeed) -> Void)? = nil) {
        self.onSaved = onSaved
    }

    var body: some View {
        Form {
            Section("メモ") {
                TextEditor(text: $bodyText)
                    .frame(minHeight: 180)
            }

            Section("任意") {
                TextField("学習目的", text: $learningGoal, axis: .vertical)
                    .lineLimit(1...3)
            }

            if let errorMessage {
                Section {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                }
            }

            if let savedNote {
                Section {
                    ContentUnavailableView(
                        "保存しました",
                        systemImage: "checkmark.circle",
                        description: Text("Note ID: \(savedNote.id)")
                    )
                }
            }

            Section {
                Button {
                    Task {
                        await save()
                    }
                } label: {
                    if isSubmitting {
                        ProgressView()
                    } else {
                        Text("保存")
                    }
                }
                .disabled(isSubmitting || bodyText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
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

    private func save() async {
        isSubmitting = true
        errorMessage = nil
        savedNote = nil

        do {
            let note = try await session.makeNoteSeedService().create(
                body: bodyText,
                learningGoal: learningGoal
            )
            savedNote = note
            bodyText = ""
            learningGoal = ""
            onSaved?(note)
        } catch {
            errorMessage = error.localizedDescription
        }

        isSubmitting = false
    }
}
