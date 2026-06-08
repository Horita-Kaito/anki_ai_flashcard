import Foundation

struct NoteSeed: Decodable, Identifiable, Equatable {
    let id: Int
    let body: String
    let domainTemplateId: Int?
    let subdomain: String?
    let learningGoal: String?
    let noteContext: String?
    let candidatesPendingCount: Int?
    let candidatesAdoptedCount: Int?
    let generationAttemptsCount: Int?
    let createdAt: Date?
    let updatedAt: Date?
}

struct CreateNoteSeedRequest: Encodable {
    let body: String
    let domainTemplateId: Int?
    let subdomain: String?
    let learningGoal: String?
    let noteContext: String?
}
