import SwiftUI

struct CandidateAdoptionView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var session: AuthSessionStore

    let candidate: AiCardCandidate
    let onAdopted: (Card) -> Void

    @State private var decks: [Deck] = []
    @State private var selectedDeckId: Int?
    @State private var question: String
    @State private var answer: String
    @State private var explanation: String
    @State private var isLoadingDecks = false
    @State private var isSaving = false
    @State private var errorMessage: String?

    init(candidate: AiCardCandidate, onAdopted: @escaping (Card) -> Void) {
        self.candidate = candidate
        self.onAdopted = onAdopted
        _question = State(initialValue: candidate.question)
        _answer = State(initialValue: candidate.answer)
        _explanation = State(initialValue: candidate.explanation ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("採用先") {
                    if isLoadingDecks {
                        ProgressView()
                    } else if decks.isEmpty {
                        ContentUnavailableView(
                            "デッキがありません",
                            systemImage: "rectangle.stack",
                            description: Text("先にデッキを作成してください。")
                        )
                    } else {
                        Picker("デッキ", selection: selectedDeckBinding) {
                            ForEach(decks) { deck in
                                Text(deck.path ?? deck.name)
                                    .tag(deck.id)
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

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                    }
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
                    Button {
                        Task {
                            await adopt()
                        }
                    } label: {
                        if isSaving {
                            ProgressView()
                        } else {
                            Text("採用")
                        }
                    }
                    .disabled(!canSubmit)
                }
            }
            .task {
                await loadDecks()
            }
        }
    }

    private var selectedDeckBinding: Binding<Int> {
        Binding(
            get: { selectedDeckId ?? decks.first?.id ?? 0 },
            set: { selectedDeckId = $0 }
        )
    }

    private var canSubmit: Bool {
        selectedDeckId != nil
            && !question.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !answer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !isSaving
            && !isLoadingDecks
    }

    private func loadDecks() async {
        isLoadingDecks = true
        errorMessage = nil

        do {
            decks = try await session.makeDeckService().list()
            selectedDeckId = preferredDeckId(from: decks)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoadingDecks = false
    }

    private func preferredDeckId(from decks: [Deck]) -> Int? {
        if let suggestedDeckId = candidate.suggestedDeckId,
           decks.contains(where: { $0.id == suggestedDeckId }) {
            return suggestedDeckId
        }

        return decks.first?.id
    }

    private func adopt() async {
        guard let selectedDeckId else {
            return
        }

        isSaving = true
        errorMessage = nil

        do {
            let card = try await session.makeAiCandidateService().adopt(
                candidateId: candidate.id,
                deckId: selectedDeckId,
                question: question.trimmingCharacters(in: .whitespacesAndNewlines),
                answer: answer.trimmingCharacters(in: .whitespacesAndNewlines),
                explanation: normalizedExplanation
            )
            onAdopted(card)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }

        isSaving = false
    }

    private var normalizedExplanation: String? {
        let value = explanation.trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }
}
