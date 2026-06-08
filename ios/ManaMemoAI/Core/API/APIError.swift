import Foundation

enum APIError: LocalizedError {
    case invalidResponse
    case httpStatus(Int, String?)
    case decoding(Error)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "サーバーから不正なレスポンスが返されました。"
        case .httpStatus(_, let message):
            return message ?? "リクエストに失敗しました。"
        case .decoding:
            return "レスポンスの読み取りに失敗しました。"
        }
    }
}

struct APIErrorResponse: Decodable {
    let message: String
    let errors: [String: [String]]?
}
