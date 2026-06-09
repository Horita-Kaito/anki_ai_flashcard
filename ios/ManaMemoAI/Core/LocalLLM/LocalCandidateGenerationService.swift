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
        runtime: LocalLLMRuntime = LlamaFrameworkRuntime.shared,
        fileLocator: LocalLLMModelFileLocator = LocalLLMModelFileLocator()
    ) {
        self.runtime = runtime
        self.fileLocator = fileLocator
    }

    // 1メモから生成するカード候補の上限。チャンク分割時に増えすぎるのを抑える。
    private let maxTotalDrafts = 8

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

        // 長文メモはコンテキスト長を超えないようチャンクへ分割し、各チャンクで生成してマージする。
        let chunks = LocalNoteChunker.chunks(
            for: noteBody,
            maxCharacters: maxChunkCharacters(for: settings)
        )

        do {
            var merged: [LocalCandidateDraft] = []
            var seenQuestions = Set<String>()
            var anyChunkSucceeded = false
            var lastError: Error?

            for chunk in chunks {
                try Task.checkCancellation()

                do {
                    let drafts = try await generateDrafts(
                        forText: chunk,
                        learningGoal: note.learningGoal,
                        model: model,
                        modelURL: modelURL,
                        settings: settings
                    )
                    anyChunkSucceeded = true
                    for draft in drafts where seenQuestions.insert(draft.question).inserted {
                        merged.append(draft)
                    }
                } catch let error as CancellationError {
                    throw error
                } catch {
                    // 1チャンクの失敗は許容し、他チャンクの結果を活かす。
                    lastError = error
                }

                if merged.count >= maxTotalDrafts {
                    break
                }
            }

            guard anyChunkSucceeded, !merged.isEmpty else {
                throw lastError ?? LocalLLMGenerationError.invalidResponse
            }

            return LocalCandidateGenerationResult(
                drafts: Array(merged.prefix(maxTotalDrafts)),
                source: .localLLM(modelName: model.displayName)
            )
        } catch let error as CancellationError {
            throw error
        } catch {
            return try fallbackOrThrow(from: note, settings: settings, error: error)
        }
    }

    private func generateDrafts(
        forText text: String,
        learningGoal: String?,
        model: LocalLLMModelSpec,
        modelURL: URL,
        settings: LocalLLMSettingsStore
    ) async throws -> [LocalCandidateDraft] {
        let prompt = LocalLLMPromptBuilder.buildPrompt(noteBody: text, learningGoal: learningGoal)
        let request = LocalLLMGenerationRequest(
            prompt: prompt,
            model: model,
            modelURL: modelURL,
            options: settings.generationOptions
        )
        let output = try await runtime.generateText(for: request)
        return try await LocalLLMGenerationRepairer.parseOrRepairCandidates(
            from: output,
            request: request,
            runtime: runtime
        )
    }

    // プロンプトテンプレートと生成トークン分の余白を引いた残りを、控えめな
    // 文字/トークン換算（日本語想定）でチャンクの最大文字数に換算する。
    private func maxChunkCharacters(for settings: LocalLLMSettingsStore) -> Int {
        let options = settings.generationOptions
        let promptTokenBudget = max(256, options.contextTokens - options.maxTokens - 128)
        return max(200, promptTokenBudget * 2)
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

/// 長文メモを生成可能なサイズへ分割する純粋ロジック。段落→文の順で区切り、
/// 1チャンクが `maxCharacters` 以内になるよう貪欲にまとめる。1つの文が上限を
/// 超える場合は文字数でハード分割する。
enum LocalNoteChunker {
    static func chunks(for body: String, maxCharacters: Int) -> [String] {
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            return []
        }

        let budget = max(1, maxCharacters)
        guard trimmed.count > budget else {
            return [trimmed]
        }

        var units: [String] = []
        for unit in splitIntoUnits(trimmed) {
            if unit.count <= budget {
                units.append(unit)
            } else {
                units.append(contentsOf: hardSplit(unit, budget: budget))
            }
        }

        var chunks: [String] = []
        var current = ""
        for unit in units {
            if current.isEmpty {
                current = unit
            } else if current.count + 1 + unit.count <= budget {
                current += "\n" + unit
            } else {
                chunks.append(current)
                current = unit
            }
        }

        if !current.isEmpty {
            chunks.append(current)
        }

        return chunks
    }

    private static func splitIntoUnits(_ text: String) -> [String] {
        var units: [String] = []
        for paragraph in text.split(whereSeparator: \.isNewline) {
            let trimmed = paragraph.trimmingCharacters(in: .whitespaces)
            guard !trimmed.isEmpty else {
                continue
            }
            units.append(contentsOf: splitSentences(trimmed))
        }
        return units
    }

    private static func splitSentences(_ text: String) -> [String] {
        let terminators: Set<Character> = ["。", "！", "？", "!", "?"]
        var sentences: [String] = []
        var current = ""

        for character in text {
            current.append(character)
            if terminators.contains(character) {
                let trimmed = current.trimmingCharacters(in: .whitespaces)
                if !trimmed.isEmpty {
                    sentences.append(trimmed)
                }
                current = ""
            }
        }

        let tail = current.trimmingCharacters(in: .whitespaces)
        if !tail.isEmpty {
            sentences.append(tail)
        }

        return sentences
    }

    private static func hardSplit(_ text: String, budget: Int) -> [String] {
        var result: [String] = []
        var remaining = Substring(text)

        while remaining.count > budget {
            let splitIndex = remaining.index(remaining.startIndex, offsetBy: budget)
            result.append(String(remaining[..<splitIndex]))
            remaining = remaining[splitIndex...]
        }

        if !remaining.isEmpty {
            result.append(String(remaining))
        }

        return result
    }
}
