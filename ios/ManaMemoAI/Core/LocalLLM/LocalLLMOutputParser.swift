import Foundation

enum LocalLLMOutputParser {
    static func parseCandidates(from output: String) throws -> [LocalCandidateDraft] {
        let jsonText = extractJSONObject(from: output)
        guard let data = jsonText.data(using: .utf8) else {
            throw LocalLLMGenerationError.invalidResponse
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        if let envelope = try? decoder.decode(CandidateEnvelope.self, from: data) {
            return envelope.cards.normalizedDrafts
        }

        if let cards = try? decoder.decode([CandidatePayload].self, from: data) {
            return cards.normalizedDrafts
        }

        throw LocalLLMGenerationError.invalidResponse
    }

    private static func extractJSONObject(from output: String) -> String {
        let trimmed = output.trimmingCharacters(in: .whitespacesAndNewlines)

        guard
            let start = trimmed.firstIndex(where: { $0 == "{" || $0 == "[" }),
            let end = trimmed.lastIndex(where: { $0 == "}" || $0 == "]" }),
            start <= end
        else {
            return trimmed
        }

        return String(trimmed[start...end])
    }
}

private struct CandidateEnvelope: Decodable {
    let cards: [CandidatePayload]
}

private struct CandidatePayload: Decodable {
    let question: String
    let answer: String
    let focusType: String?
    let rationale: String?
}

private extension Array where Element == CandidatePayload {
    var normalizedDrafts: [LocalCandidateDraft] {
        compactMap { payload in
            let question = payload.question.trimmingCharacters(in: .whitespacesAndNewlines)
            let answer = payload.answer.trimmingCharacters(in: .whitespacesAndNewlines)

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
