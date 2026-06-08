import Foundation

@MainActor
final class NoteSeedService {
    private let apiClient: APIClient

    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    func create(body: String, learningGoal: String?) async throws -> NoteSeed {
        let request = CreateNoteSeedRequest(
            body: body,
            domainTemplateId: nil,
            subdomain: nil,
            learningGoal: learningGoal?.nilIfBlank,
            noteContext: nil
        )
        let envelope: APIEnvelope<NoteSeed> = try await apiClient.request(
            "note-seeds",
            method: .post,
            body: request
        )
        return envelope.data
    }
}

private extension String {
    var nilIfBlank: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}
