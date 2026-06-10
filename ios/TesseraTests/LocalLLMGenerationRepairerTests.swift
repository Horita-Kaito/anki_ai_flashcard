import XCTest
@testable import Tessera

final class LocalLLMGenerationRepairerTests: XCTestCase {
    func testRepairsInvalidInitialOutputWithSecondGeneration() async throws {
        let runtime = RepairMockRuntime(
            outputs: [
                """
                {
                  "cards": [
                    {
                      "question": "ローカルLLMの利点は？",
                      "answer": "学習データを端末内に保てることです。",
                      "focus_type": "benefit",
                      "rationale": "設計方針を確認するため。"
                    }
                  ]
                }
                """
            ]
        )
        let request = LocalLLMGenerationRequest(
            prompt: "メモからカードを作って",
            model: LocalLLMModelCatalog.model(id: LocalLLMModelCatalog.defaultModelId),
            modelURL: URL(filePath: "/tmp/model.gguf"),
            options: .default
        )

        let drafts = try await LocalLLMGenerationRepairer.parseOrRepairCandidates(
            from: "カード候補: question=ローカルLLM",
            request: request,
            runtime: runtime
        )

        let prompts = await runtime.prompts
        XCTAssertEqual(drafts.count, 1)
        XCTAssertEqual(drafts[0].question, "ローカルLLMの利点は？")
        XCTAssertEqual(prompts.count, 1)
        XCTAssertTrue(prompts[0].contains("修復対象:"))
        XCTAssertTrue(prompts[0].contains("カード候補: question=ローカルLLM"))
    }
}

private actor RepairMockRuntime: LocalLLMRuntime {
    nonisolated let diagnostics = LocalLLMRuntimeDiagnostics.unavailable

    private var outputs: [String]
    private(set) var prompts: [String] = []

    init(outputs: [String]) {
        self.outputs = outputs
    }

    func generateText(for request: LocalLLMGenerationRequest) async throws -> String {
        prompts.append(request.prompt)

        guard !outputs.isEmpty else {
            throw LocalLLMGenerationError.invalidResponse
        }

        return outputs.removeFirst()
    }
}
