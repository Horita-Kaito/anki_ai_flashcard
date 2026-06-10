import Foundation

struct LoginRequest: Encodable {
    let email: String
    let password: String
    let deviceName: String
}

struct TokenResponse: Decodable {
    let data: User
    let token: String
}

struct User: Decodable, Identifiable, Equatable {
    let id: Int
    let name: String
    let email: String
}
