import Foundation

enum LocalLLMOutputParser {
    static func parseCandidates(from output: String) throws -> [LocalCandidateDraft] {
        for jsonText in extractJSONCandidates(from: output) {
            guard let data = jsonText.data(using: .utf8) else {
                continue
            }

            if let drafts = decodeDrafts(from: data), !drafts.isEmpty {
                return drafts
            }
        }

        throw LocalLLMGenerationError.invalidResponse
    }

    private static func decodeDrafts(from data: Data) -> [LocalCandidateDraft]? {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        if let envelope = try? decoder.decode(CandidateEnvelope.self, from: data) {
            return envelope.normalizedDrafts
        }

        if let cards = try? decoder.decode([CandidatePayload].self, from: data) {
            return cards.normalizedDrafts
        }

        if let card = try? decoder.decode(CandidatePayload.self, from: data) {
            return [card].normalizedDrafts
        }

        return nil
    }

    private static func extractJSONCandidates(from output: String) -> [String] {
        let trimmed = output
            .replacingOccurrences(of: "```json", with: "```")
            .replacingOccurrences(of: "```JSON", with: "```")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        var candidates = [trimmed]
        candidates.append(contentsOf: balancedJSONFragments(in: trimmed))

        return Array(Set(candidates)).filter { !$0.isEmpty }
    }

    private static func balancedJSONFragments(in text: String) -> [String] {
        var fragments: [String] = []

        for start in text.indices where text[start] == "{" || text[start] == "[" {
            if let fragment = balancedJSONFragment(in: text, startingAt: start) {
                fragments.append(fragment)
            }
        }

        return fragments
    }

    private static func balancedJSONFragment(in text: String, startingAt start: String.Index) -> String? {
        var expectedClosings: [Character] = []
        var index = start
        var isInsideString = false
        var isEscaping = false

        while index < text.endIndex {
            let character = text[index]

            if isEscaping {
                isEscaping = false
            } else if character == "\\" {
                isEscaping = isInsideString
            } else if character == "\"" {
                isInsideString.toggle()
            } else if !isInsideString {
                if character == "{" {
                    expectedClosings.append("}")
                } else if character == "[" {
                    expectedClosings.append("]")
                } else if character == "}" || character == "]" {
                    guard expectedClosings.popLast() == character else {
                        return nil
                    }

                    if expectedClosings.isEmpty {
                        let end = text.index(after: index)
                        return String(text[start..<end])
                    }
                }
            }

            text.formIndex(after: &index)
        }

        return nil
    }
}

private struct CandidateEnvelope: Decodable {
    let cards: [CandidatePayload]?
    let candidates: [CandidatePayload]?
    let flashcards: [CandidatePayload]?

    var normalizedDrafts: [LocalCandidateDraft] {
        (cards ?? candidates ?? flashcards ?? []).normalizedDrafts
    }
}

private struct CandidatePayload: Decodable {
    let question: String?
    let answer: String?
    let front: String?
    let back: String?
    let prompt: String?
    let response: String?
    let explanation: String?
    let focusType: String?
    let rationale: String?
}

private extension Array where Element == CandidatePayload {
    var normalizedDrafts: [LocalCandidateDraft] {
        compactMap { payload in
            let question = (payload.question ?? payload.front ?? payload.prompt)?
                .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            let answer = (payload.answer ?? payload.back ?? payload.response ?? payload.explanation)?
                .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

            guard !question.isEmpty, !answer.isEmpty else {
                return nil
            }

            return LocalCandidateDraft(
                question: question,
                answer: answer,
                focusType: payload.focusType?.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty ?? "basic_qa",
                rationale: payload.rationale?.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty ?? "ローカルLLMがメモから生成した候補です。"
            )
        }
    }
}

private extension String {
    var nilIfEmpty: String? {
        isEmpty ? nil : self
    }
}
