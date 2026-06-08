import SwiftUI

struct NoteCreateView: View {
    @EnvironmentObject private var session: AuthSessionStore
    @State private var bodyText = ""
    @State private var learningGoal = ""
    @State private var isSubmitting = false
    @State private var errorMessage: String?
    @State private var savedNote: NoteSeed?

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
    }

    private func save() async {
        isSubmitting = true
        errorMessage = nil
        savedNote = nil

        do {
            savedNote = try await session.makeNoteSeedService().create(
                body: bodyText,
                learningGoal: learningGoal
            )
            bodyText = ""
            learningGoal = ""
        } catch {
            errorMessage = error.localizedDescription
        }

        isSubmitting = false
    }
}
