import Foundation

struct LocalCandidateGenerationResult: Equatable {
    enum Source: Equatable {
        case localLLM(modelName: String)
        case ruleBasedFallback
    }

    let drafts: [LocalCandidateDraft]
    let source: Source
}

@MainActor
struct LocalCandidateGenerationService {
    private let runtime: LocalLLMRuntime
    private let fileLocator: LocalLLMModelFileLocator

    init(
        runtime: LocalLLMRuntime = UnavailableLocalLLMRuntime(),
        fileLocator: LocalLLMModelFileLocator = LocalLLMModelFileLocator()
    ) {
        self.runtime = runtime
        self.fileLocator = fileLocator
    }

    func generate(
        from note: LocalNoteSeed,
        settings: LocalLLMSettingsStore
    ) async throws -> LocalCandidateGenerationResult {
        let model = settings.selectedModel
        let noteBody = note.body.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !noteBody.isEmpty else {
            throw LocalLLMGenerationError.emptyPrompt
        }

        guard let modelURL = fileLocator.downloadedURL(for: model) else {
            return try fallbackOrThrow(
                from: note,
                settings: settings,
                error: LocalLLMGenerationError.modelFileMissing(model.fileName)
            )
        }

        do {
            let prompt = LocalLLMPromptBuilder.buildPrompt(noteBody: noteBody, learningGoal: note.learningGoal)
            let output = try await runtime.generateText(
                for: LocalLLMGenerationRequest(
                    prompt: prompt,
                    model: model,
                    modelURL: modelURL
                )
            )
            let drafts = try LocalLLMOutputParser.parseCandidates(from: output)
            guard !drafts.isEmpty else {
                throw LocalLLMGenerationError.invalidResponse
            }

            return LocalCandidateGenerationResult(
                drafts: drafts,
                source: .localLLM(modelName: model.displayName)
            )
        } catch {
            return try fallbackOrThrow(from: note, settings: settings, error: error)
        }
    }

    private func fallbackOrThrow(
        from note: LocalNoteSeed,
        settings: LocalLLMSettingsStore,
        error: Error
    ) throws -> LocalCandidateGenerationResult {
        guard settings.usesRuleBasedFallback else {
            throw error
        }

        return LocalCandidateGenerationResult(
            drafts: LocalCandidateGenerator.generate(from: note),
            source: .ruleBasedFallback
        )
    }
}
