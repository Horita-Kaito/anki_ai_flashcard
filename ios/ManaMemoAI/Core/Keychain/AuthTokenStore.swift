import Foundation

protocol AuthTokenStore {
    var token: String? { get }
    func saveToken(_ token: String)
    func deleteToken()
}
