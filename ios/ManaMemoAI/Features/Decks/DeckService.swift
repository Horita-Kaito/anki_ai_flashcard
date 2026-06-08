import Foundation

@MainActor
final class DeckService {
    private let apiClient: APIClient

    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    func list() async throws -> [Deck] {
        let envelope: APIEnvelope<[Deck]> = try await apiClient.request("decks")
        return envelope.data
    }
}
