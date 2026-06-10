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
            // トークン保存に失敗したら無言で進めず、ユーザーへ伝える。
            // 保存できないまま authenticated にすると次回起動でセッションが消える。
            guard tokenStore.saveToken(response.token) else {
                errorMessage = String(localized: "ログイン情報の保存に失敗しました。もう一度お試しください。")
                return
            }
            state = .authenticated(response.data)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func logout() async {
        // ログアウト対象ユーザーの同期カーソル／最終同期時刻を破棄する。
        // 別アカウントで再ログインした際に他人の差分カーソルを引き継がないため。
        let loggingOutUserId = currentUserId

        do {
            try await authService.revokeCurrentToken()
        } catch {
            errorMessage = error.localizedDescription
        }

        SyncService.clearCursor(for: loggingOutUserId)
        tokenStore.deleteToken()
        state = .signedOut
    }

    var isAuthenticated: Bool {
        if case .authenticated = state {
            return true
        }
        return false
    }

    /// ログイン中ユーザーのID（未ログインは nil）。同期カーソルの名前空間化に使う。
    var currentUserId: Int? {
        if case .authenticated(let user) = state {
            return user.id
        }
        return nil
    }

    /// 認証済みトークンを載せた APIClient を生成する（同期サービス等で再利用）。
    func makeAPIClient() -> APIClient {
        APIClient(
            baseURL: AppConfig.apiBaseURL,
            tokenProvider: { self.tokenStore.token }
        )
    }
}
