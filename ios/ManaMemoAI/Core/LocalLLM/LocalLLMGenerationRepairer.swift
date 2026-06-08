import Foundation

enum LocalLLMGenerationRepairer {
    static func parseOrRepairCandidates(
        from output: String,
        request: LocalLLMGenerationRequest,
        runtime: LocalLLMRuntime
    ) async throws -> [LocalCandidateDraft] {
        do {
            return try LocalLLMOutputParser.parseCandidates(from: output)
        } catch LocalLLMGenerationError.invalidResponse {
            let repairOutput = try await runtime.generateText(for: repairRequest(from: output, originalRequest: request))
            return try LocalLLMOutputParser.parseCandidates(from: repairOutput)
        }
    }

    static func repairPrompt(for output: String) -> String {
        """
        次のローカルLLM出力を、暗記カード候補のJSONだけに修復してください。
        説明文、Markdown、コードフェンスは出さないでください。
        最初の文字は {、最後の文字は } にしてください。
        cards配列を持つオブジェクトにし、各要素には question、answer、focus_type、rationale を必ず含めてください。
        question と answer は空文字にしないでください。

        修復対象:
        \(output)

        JSON形式:
        {
          "cards": [
            {
              "question": "質問",
              "answer": "答え",
              "focus_type": "definition",
              "rationale": "この候補を作った理由"
            }
          ]
        }
        """
    }

    private static func repairRequest(
        from output: String,
        originalRequest: LocalLLMGenerationRequest
    ) -> LocalLLMGenerationRequest {
        LocalLLMGenerationRequest(
            prompt: repairPrompt(for: output),
            model: originalRequest.model,
            modelURL: originalRequest.modelURL,
            options: LocalLLMGenerationOptions(
                maxTokens: min(max(originalRequest.options.maxTokens, 512), 1024),
                temperature: min(originalRequest.options.temperature, 0.2),
                topP: min(originalRequest.options.topP, 0.9),
                contextTokens: originalRequest.options.contextTokens
            )
        )
    }
}
