import Foundation
import UIKit

enum AppConfig {
    static var apiBaseURL: URL {
        if let value = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
           let url = URL(string: value) {
            return url
        }

        return URL(string: "http://127.0.0.1:8000/api/v1")!
    }

    @MainActor
    static var deviceName: String {
        UIDevice.current.name.isEmpty ? "iPhone" : UIDevice.current.name
    }
}
