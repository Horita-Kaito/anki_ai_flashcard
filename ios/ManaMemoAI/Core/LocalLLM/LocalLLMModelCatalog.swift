import Foundation

struct LocalLLMModelSpec: Identifiable, Equatable, Sendable {
    let id: String
    let displayName: String
    let family: String
    let fileName: String
    let quantization: String
    let parameterCount: String
    let approximateSizeGB: Double
    let minimumMemoryGB: Int
    let contextTokens: Int
    let downloadURL: URL?
}

enum LocalLLMModelCatalog {
    static let defaultModelId = "qwen2.5-3b-instruct-q4-k-m"

    static let models: [LocalLLMModelSpec] = [
        LocalLLMModelSpec(
            id: "qwen2.5-3b-instruct-q4-k-m",
            displayName: "Qwen2.5 3B Instruct",
            family: "Qwen2.5",
            fileName: "qwen2.5-3b-instruct-q4_k_m.gguf",
            quantization: "Q4_K_M",
            parameterCount: "3B",
            approximateSizeGB: 2.1,
            minimumMemoryGB: 6,
            contextTokens: 4096,
            downloadURL: URL(string: "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf")
        ),
        LocalLLMModelSpec(
            id: "qwen2.5-1.5b-instruct-q4-k-m",
            displayName: "Qwen2.5 1.5B Instruct",
            family: "Qwen2.5",
            fileName: "qwen2.5-1.5b-instruct-q4_k_m.gguf",
            quantization: "Q4_K_M",
            parameterCount: "1.5B",
            approximateSizeGB: 1.1,
            minimumMemoryGB: 4,
            contextTokens: 4096,
            downloadURL: URL(string: "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf")
        ),
        LocalLLMModelSpec(
            id: "qwen2.5-0.5b-instruct-q4-k-m",
            displayName: "Qwen2.5 0.5B Instruct",
            family: "Qwen2.5",
            fileName: "qwen2.5-0.5b-instruct-q4_k_m.gguf",
            quantization: "Q4_K_M",
            parameterCount: "0.5B",
            approximateSizeGB: 0.5,
            minimumMemoryGB: 3,
            contextTokens: 4096,
            downloadURL: URL(string: "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf")
        )
    ]

    static func model(id: String) -> LocalLLMModelSpec {
        models.first { $0.id == id } ?? models[0]
    }
}
