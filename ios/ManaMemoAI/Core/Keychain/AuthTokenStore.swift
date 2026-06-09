import Foundation

protocol AuthTokenStore {
    var token: String? { get }
    @discardableResult
    func saveToken(_ token: String) -> Bool
    func deleteToken()
}
