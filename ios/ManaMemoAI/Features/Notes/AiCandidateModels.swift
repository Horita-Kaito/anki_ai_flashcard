import Foundation

struct AiCardCandidate: Decodable, Identifiable, Equatable {
    let id: Int
    let noteSeedId: Int
    let aiGenerationLogId: Int?
    let provider: String?
    let modelName: String?
    let question: String
    let answer: String
    let cardType: String?
    let focusType: String?
    let rationale: String?
    let explanation: String?
    let confidence: Double?
    let qualityWarnings: [String]
    let status: String?
    let suggestedDeckId: Int?
    let createdAt: Date?
    let updatedAt: Date?
}

struct AiGenerationStatus: Decodable, Equatable {
    let id: Int?
    let noteSeedId: Int
    let status: String
    let jobId: String?
    let provider: String?
    let modelName: String?
    let candidatesCount: Int?
    let durationMs: Int?
    let errorReason: String?
    let chunksTotal: Int?
    let chunksCompleted: Int?
    let chunksFailed: Int?
    let createdAt: Date?
    let updatedAt: Date?
}

struct GenerateCandidatesRequest: Encodable {
    let domainTemplateId: Int?
}

struct AdoptCandidateRequest: Encodable {
    let deckId: Int
    let question: String
    let answer: String
    let explanation: String?
    let scheduler: String
}

struct Card: Decodable, Identifiable, Equatable {
    let id: Int
    let deckId: Int
    let domainTemplateId: Int?
    let sourceNoteSeedId: Int?
    let sourceAiCandidateId: Int?
    let question: String
    let answer: String
    let explanation: String?
    let cardType: String?
    let isSuspended: Bool
    let scheduler: String
    let createdAt: Date?
    let updatedAt: Date?
}
