import Foundation

@MainActor
final class AiCandidateService {
    private let apiClient: APIClient

    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    func list(noteSeedId: Int) async throws -> [AiCardCandidate] {
        let envelope: APIEnvelope<[AiCardCandidate]> = try await apiClient.request(
            "note-seeds/\(noteSeedId)/candidates"
        )
        return envelope.data
    }

    func generate(noteSeedId: Int) async throws -> AiGenerationStatus {
        let envelope: APIEnvelope<AiGenerationStatus> = try await apiClient.request(
            "note-seeds/\(noteSeedId)/generate-candidates",
            method: .post,
            body: GenerateCandidatesRequest(domainTemplateId: nil)
        )
        return envelope.data
    }

    func status(noteSeedId: Int) async throws -> AiGenerationStatus {
        let envelope: APIEnvelope<AiGenerationStatus> = try await apiClient.request(
            "note-seeds/\(noteSeedId)/generation-status"
        )
        return envelope.data
    }

    func adopt(
        candidateId: Int,
        deckId: Int,
        question: String,
        answer: String,
        explanation: String?
    ) async throws -> Card {
        let request = AdoptCandidateRequest(
            deckId: deckId,
            question: question,
            answer: answer,
            explanation: explanation,
            scheduler: "fsrs"
        )
        let envelope: APIEnvelope<Card> = try await apiClient.request(
            "ai-card-candidates/\(candidateId)/adopt",
            method: .post,
            body: request
        )
        return envelope.data
    }
}
