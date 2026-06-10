import Foundation
import Security

final class KeychainTokenStore: AuthTokenStore {
    private let service = "com.tessera.auth"
    private let account = "bearer-token"

    var token: String? {
        var query = baseQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data else {
            return nil
        }

        return String(data: data, encoding: .utf8)
    }

    @discardableResult
    func saveToken(_ token: String) -> Bool {
        deleteToken()

        var query = baseQuery
        query[kSecValueData as String] = Data(token.utf8)
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly

        let status = SecItemAdd(query as CFDictionary, nil)
        if status != errSecSuccess {
            // 保存失敗を握りつぶさず可視化する（次回起動でトークン消失の原因切り分け用）。
            assertionFailure("KeychainTokenStore.saveToken failed: OSStatus \(status)")
            return false
        }
        return true
    }

    func deleteToken() {
        SecItemDelete(baseQuery as CFDictionary)
    }

    private var baseQuery: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
    }
}
