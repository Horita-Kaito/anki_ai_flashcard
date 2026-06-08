import Foundation

struct LocalLLMGenerationOptions: Equatable, Sendable {
    var maxTokens: Int
    var temperature: Double
    var topP: Double
    var contextTokens: Int

    static let `default` = LocalLLMGenerationOptions(
        maxTokens: 768,
        temperature: 0.2,
        topP: 0.9,
        contextTokens: 2048
    )
}
