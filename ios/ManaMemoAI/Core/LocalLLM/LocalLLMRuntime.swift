import Foundation

struct LocalLLMGenerationRequest: Equatable, Sendable {
    let prompt: String
    let model: LocalLLMModelSpec
    let modelURL: URL
    let options: LocalLLMGenerationOptions
}

enum LocalLLMGenerationError: LocalizedError, Equatable {
    case modelFileMissing(String)
    case runtimeUnavailable
    case emptyPrompt
    case invalidResponse

    var errorDescription: String? {
        switch self {
        case .modelFileMissing(let fileName):
            return "\(fileName) をダウンロードしてください。"
        case .runtimeUnavailable:
            return "ローカルLLMランタイムが未接続です。"
        case .emptyPrompt:
            return "生成するメモが空です。"
        case .invalidResponse:
            return "ローカルLLMの出力をカード候補として読み取れませんでした。"
        }
    }
}

protocol LocalLLMRuntime: Sendable {
    var diagnostics: LocalLLMRuntimeDiagnostics { get }

    func generateText(for request: LocalLLMGenerationRequest) async throws -> String
}

struct UnavailableLocalLLMRuntime: LocalLLMRuntime {
    let diagnostics = LocalLLMRuntimeDiagnostics.unavailable

    func generateText(for request: LocalLLMGenerationRequest) async throws -> String {
        _ = request
        throw LocalLLMGenerationError.runtimeUnavailable
    }
}
