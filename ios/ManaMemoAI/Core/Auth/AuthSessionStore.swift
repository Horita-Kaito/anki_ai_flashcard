import Foundation

@MainActor
final class AuthSessionStore: ObservableObject {
    enum State: Equatable {
        case checking
        case signedOut
        case authenticated(User)
    }

    @Published private(set) var state: State = .checking
    @Published var errorMessage: String?

    private let tokenStore: AuthTokenStore
    private let authService: AuthService

    init(tokenStore: AuthTokenStore, authService: AuthService) {
        self.tokenStore = tokenStore
        self.authService = authService
    }

    static func bootstrap() -> AuthSessionStore {
        let tokenStore = KeychainTokenStore()
        let apiClient = APIClient(
            baseURL: AppConfig.apiBaseURL,
            tokenProvider: { tokenStore.token }
        )
        return AuthSessionStore(
            tokenStore: tokenStore,
            authService: AuthService(apiClient: apiClient)
        )
    }

    func restore() async {
        guard tokenStore.token != nil else {
            state = .signedOut
            return
        }

        do {
            state = .authenticated(try await authService.me())
        } catch {
            tokenStore.deleteToken()
            state = .signedOut
        }
    }

    func login(email: String, password: String) async {
        errorMessage = nil

        do {
            let response = try await authService.issueToken(email: email, password: password)
            tokenStore.saveToken(response.token)
            state = .authenticated(response.data)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func logout() async {
        do {
            try await authService.revokeCurrentToken()
        } catch {
            errorMessage = error.localizedDescription
        }

        tokenStore.deleteToken()
        state = .signedOut
    }

    func makeDeckService() -> DeckService {
        DeckService(
            apiClient: APIClient(
                baseURL: AppConfig.apiBaseURL,
                tokenProvider: { self.tokenStore.token }
            )
        )
    }

    func makeNoteSeedService() -> NoteSeedService {
        NoteSeedService(
            apiClient: APIClient(
                baseURL: AppConfig.apiBaseURL,
                tokenProvider: { self.tokenStore.token }
            )
        )
    }

    func makeAiCandidateService() -> AiCandidateService {
        AiCandidateService(
            apiClient: APIClient(
                baseURL: AppConfig.apiBaseURL,
                tokenProvider: { self.tokenStore.token }
            )
        )
    }
}
