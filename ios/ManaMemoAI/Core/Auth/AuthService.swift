import Foundation

@MainActor
final class AuthService {
    private let apiClient: APIClient

    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    func issueToken(email: String, password: String) async throws -> TokenResponse {
        try await apiClient.request(
            "tokens",
            method: .post,
            body: LoginRequest(
                email: email,
                password: password,
                deviceName: AppConfig.deviceName
            )
        )
    }

    func me() async throws -> User {
        let envelope: APIEnvelope<User> = try await apiClient.request("me")
        return envelope.data
    }

    func revokeCurrentToken() async throws {
        let _: EmptyResponse = try await apiClient.request("tokens/current", method: .delete)
    }
}
