import SwiftUI
import SwiftData

struct NoteDetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var allCandidates: [LocalAiCardCandidate]
    let note: LocalNoteSeed

    @StateObject private var llmSettings = LocalLLMSettingsStore()
    @State private var isGenerating = false
    @State private var selectedCandidate: LocalAiCardCandidate?
    @State private var adoptedCardMessage: String?
    @State private var generationErrorMessage: String?

    private var candidates: [LocalAiCardCandidate] {
        allCandidates
            .filter { $0.noteSeedId == note.id }
            .sorted { $0.createdAt > $1.createdAt }
    }

    var body: some View {
        List {
            Section("メモ") {
                Text(note.body)
                    .font(.body)
                    .textSelection(.enabled)

                if let learningGoal = note.learningGoal, !learningGoal.isEmpty {
                    LabeledContent("目的", value: learningGoal)
                }
            }

            Section {
                Button {
                    generate()
                } label: {
                    HStack {
                        if isGenerating {
                            ProgressView()
                        } else {
                            Image(systemName: "sparkles")
                        }
                        Text(isGenerating ? "生成中" : "ローカルAI候補を生成")
                    }
                }
                .disabled(isGenerating)

                LabeledContent("実行場所", value: "このiPhone")
                LabeledContent("モデル", value: llmSettings.selectedModel.displayName)
                LabeledContent("フォールバック", value: llmSettings.usesRuleBasedFallback ? "有効" : "無効")
            }

            if let generationErrorMessage {
                Section {
                    Label(generationErrorMessage, systemImage: "exclamationmark.triangle")
                        .foregroundStyle(.red)
                }
            }

            if let adoptedCardMessage {
                Section {
                    Label(adoptedCardMessage, systemImage: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                }
            }

            Section("候補") {
                if candidates.isEmpty {
                    ContentUnavailableView(
                        "候補がありません",
                        systemImage: "sparkles",
                        description: Text("ローカルAI候補を生成するとここに表示されます。")
                    )
                } else {
                    ForEach(candidates) { candidate in
                        CandidateRow(candidate: candidate) {
                            selectedCandidate = candidate
                        }
                    }
                }
            }
        }
        .navigationTitle("メモ詳細")
        .sheet(item: $selectedCandidate) { candidate in
            CandidateAdoptionView(candidate: candidate) { card in
                adoptedCardMessage = "カードを採用しました"
                _ = card
            }
        }
    }

    private func generate() {
        isGenerating = true
        generationErrorMessage = nil

        Task {
            do {
                let drafts = try await LocalCandidateGenerator.generate(from: note, settings: llmSettings)

                for draft in drafts {
                    let candidate = LocalAiCardCandidate(
                        noteSeedId: note.id,
                        question: draft.question,
                        answer: draft.answer,
                        focusType: draft.focusType,
                        rationale: draft.rationale
                    )
                    modelContext.insert(candidate)
                }

                note.updatedAt = .now
            } catch {
                generationErrorMessage = error.localizedDescription
            }

            isGenerating = false
        }
    }
}

private struct CandidateRow: View {
    let candidate: LocalAiCardCandidate
    let onAdopt: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(candidate.question)
                .font(.headline)
                .lineLimit(3)

            Text(candidate.answer)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(4)

            HStack(spacing: 8) {
                Label(candidate.cardType, systemImage: "rectangle.on.rectangle")
                Label(candidate.status, systemImage: "circle.fill")
            }
            .font(.caption)
            .foregroundStyle(.secondary)

            Button {
                onAdopt()
            } label: {
                Label(adoptButtonTitle, systemImage: "checkmark.circle")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(candidate.status == "adopted")
        }
        .padding(.vertical, 6)
    }

    private var adoptButtonTitle: String {
        candidate.status == "adopted" ? "採用済み" : "カードに採用"
    }
}
