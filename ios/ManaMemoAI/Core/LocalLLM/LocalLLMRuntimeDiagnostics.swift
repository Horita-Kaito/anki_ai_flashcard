import Foundation

struct LocalLLMRuntimeDiagnostics: Equatable {
    enum State: Equatable {
        case ready
        case unavailable
    }

    let state: State
    let title: String
    let detail: String

    static let unavailable = LocalLLMRuntimeDiagnostics(
        state: .unavailable,
        title: "ランタイム未接続",
        detail: "llama.cpp ブリッジを追加すると、保存済みGGUFモデルで生成できます。"
    )
}
