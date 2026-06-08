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
