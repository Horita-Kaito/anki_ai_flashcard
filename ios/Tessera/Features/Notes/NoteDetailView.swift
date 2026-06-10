import SwiftUI
import SwiftData

struct NoteDetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Query private var allCandidates: [LocalAiCardCandidate]
    let note: LocalNoteSeed

    @StateObject private var llmSettings = LocalLLMSettingsStore()
    @State private var isGenerating = false
    @State private var selectedCandidate: LocalAiCardCandidate?
    @State private var adoptedCardMessage: String?
    @State private var generationErrorMessage: String?
    @State private var generationSourceMessage: String?
    @State private var generationTask: Task<Void, Never>?
    @State private var isEditPresented = false
    @State private var isDeleteConfirmPresented = false
    @State private var isModelDownloaded = false

    private let fileLocator = LocalLLMModelFileLocator()

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
                    isGenerating ? cancelGeneration() : generate()
                } label: {
                    HStack {
                        if isGenerating {
                            ProgressView()
                        } else {
                            Image(systemName: "sparkles")
                        }
                        Text(isGenerating ? "生成を停止" : "ローカルAI候補を生成")
                    }
                }

                LabeledContent("実行場所", value: "このiPhone")
                LabeledContent("モデル", value: llmSettings.selectedModel.displayName)
                LabeledContent("フォールバック", value: llmSettings.usesRuleBasedFallback ? "有効" : "無効")
                LabeledContent("最大トークン", value: "\(llmSettings.generationOptions.maxTokens)")
            }

            if !isModelDownloaded {
                Section {
                    InlineStatusView(.warning, "ローカルLLMモデルが未ダウンロードです")

                    Text(
                        llmSettings.usesRuleBasedFallback
                            ? "このまま生成すると、AIではなくルールベースの簡易候補が作られます。高品質な候補にはモデルのダウンロードが必要です。"
                            : "モデルがないと生成できません。フォールバックが無効のため、まずモデルをダウンロードしてください。"
                    )
                    .appFootnote()
                    .foregroundStyle(AppColor.secondaryText)

                    NavigationLink {
                        LocalAISettingsView(settings: llmSettings)
                    } label: {
                        Label("モデルをダウンロード", systemImage: "icloud.and.arrow.down")
                    }
                }
            }

            if let generationErrorMessage {
                Section {
                    InlineStatusView(.error, verbatim: generationErrorMessage)
                }
            }

            if let generationSourceMessage {
                Section {
                    InlineStatusView(.info, verbatim: generationSourceMessage)
                }
            }

            if let adoptedCardMessage {
                Section {
                    InlineStatusView(.success, verbatim: adoptedCardMessage)
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
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) {
                                modelContext.deleteTracked(entity: SyncEntity.candidates, clientId: candidate.id, model: candidate)
                            } label: {
                                Label("却下", systemImage: "trash")
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("メモ詳細")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button {
                        isEditPresented = true
                    } label: {
                        Label("編集", systemImage: "pencil")
                    }

                    Button(role: .destructive) {
                        isDeleteConfirmPresented = true
                    } label: {
                        Label("メモを削除", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
                .accessibilityLabel("メモの操作")
            }
        }
        .sheet(item: $selectedCandidate) { candidate in
            CandidateAdoptionView(candidate: candidate) { card in
                adoptedCardMessage = String(localized: "カードを採用しました")
                Haptics.success()
                _ = card
            }
        }
        .sheet(isPresented: $isEditPresented) {
            NavigationStack {
                NoteEditView(note: note)
            }
        }
        .confirmationDialog(
            "このメモを削除しますか？",
            isPresented: $isDeleteConfirmPresented,
            titleVisibility: .visible
        ) {
            Button("削除", role: .destructive) {
                deleteNote()
            }
            Button("キャンセル", role: .cancel) {}
        } message: {
            Text("メモと未採用のAI候補が削除されます。採用済みカードは残ります。")
        }
        .onAppear {
            refreshModelAvailability()
        }
        .onChange(of: llmSettings.selectedModelId) {
            refreshModelAvailability()
        }
        .onDisappear {
            cancelGeneration()
        }
    }

    private func refreshModelAvailability() {
        isModelDownloaded = fileLocator.downloadedURL(for: llmSettings.selectedModel) != nil
    }

    // メモ削除時は紐づくAI候補も削除する。採用済みカードは独立データなので残す。
    private func deleteNote() {
        cancelGeneration()
        for candidate in allCandidates where candidate.noteSeedId == note.id {
            modelContext.deleteTracked(entity: SyncEntity.candidates, clientId: candidate.id, model: candidate)
        }
        modelContext.deleteTracked(entity: SyncEntity.noteSeeds, clientId: note.id, model: note)
        dismiss()
    }

    private func generate() {
        generationTask?.cancel()
        Haptics.tap()
        isGenerating = true
        generationErrorMessage = nil
        generationSourceMessage = nil

        generationTask = Task {
            do {
                let result = try await LocalCandidateGenerationService().generate(from: note, settings: llmSettings)
                try Task.checkCancellation()

                for draft in result.drafts {
                    let candidate = LocalAiCardCandidate(
                        noteSeedId: note.id,
                        question: draft.question,
                        answer: draft.answer,
                        focusType: draft.focusType,
                        rationale: draft.rationale
                    )
                    modelContext.insert(candidate)
                }

                note.markDirty()
                generationSourceMessage = result.source.message
                Haptics.success()
            } catch is CancellationError {
                generationSourceMessage = String(localized: "生成を停止しました")
            } catch {
                generationErrorMessage = error.localizedDescription
                Haptics.error()
            }

            isGenerating = false
            generationTask = nil
        }
    }

    private func cancelGeneration() {
        guard generationTask != nil else {
            return
        }

        generationTask?.cancel()
        generationSourceMessage = String(localized: "生成を停止しています")
    }
}

private extension LocalCandidateGenerationResult.Source {
    var message: String {
        switch self {
        case .localLLM(let modelName):
            return String(localized: "\(modelName) で生成しました")
        case .ruleBasedFallback:
            return String(localized: "ルールベースのフォールバックで生成しました")
        }
    }
}

private struct CandidateRow: View {
    let candidate: LocalAiCardCandidate
    let onAdopt: () -> Void

    private var isAdopted: Bool {
        candidate.status == "adopted"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text(candidate.question)
                .font(.headline)
                .lineLimit(3)

            Text(candidate.answer)
                .font(.subheadline)
                .foregroundStyle(AppColor.secondaryText)
                .lineLimit(4)

            HStack(spacing: AppSpacing.sm) {
                Label(candidate.cardType, systemImage: "rectangle.on.rectangle")
                    .metadataStyle()
                Label(isAdopted ? String(localized: "採用済み") : String(localized: "未採用"), systemImage: "circle.fill")
                    .font(.caption)
                    .foregroundStyle(isAdopted ? AppColor.success : AppColor.secondaryText)
            }
            .accessibilityElement(children: .combine)

            Button {
                onAdopt()
            } label: {
                Label(adoptButtonTitle, systemImage: "checkmark.circle")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(isAdopted)
        }
        .padding(.vertical, AppSpacing.xs)
    }

    private var adoptButtonTitle: String {
        isAdopted ? String(localized: "採用済み") : String(localized: "カードに採用")
    }
}

private struct NoteEditView: View {
    @Environment(\.dismiss) private var dismiss
    let note: LocalNoteSeed

    @State private var bodyText: String
    @State private var learningGoal: String
    @ScaledMetric(relativeTo: .body) private var editorHeight: CGFloat = 180

    init(note: LocalNoteSeed) {
        self.note = note
        _bodyText = State(initialValue: note.body)
        _learningGoal = State(initialValue: note.learningGoal ?? "")
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
        }
        .navigationTitle("メモ編集")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("閉じる") {
                    dismiss()
                }
            }

            ToolbarItem(placement: .confirmationAction) {
                Button("保存") {
                    save()
                }
                .disabled(trimmedBody.isEmpty)
            }
        }
    }

    private var trimmedBody: String {
        bodyText.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func save() {
        note.body = trimmedBody
        note.learningGoal = normalizedLearningGoal
        note.markDirty()
        Haptics.success()
        dismiss()
    }

    private var normalizedLearningGoal: String? {
        let value = learningGoal.trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }
}
