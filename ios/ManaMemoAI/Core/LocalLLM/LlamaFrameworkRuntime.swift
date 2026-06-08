import Foundation
import llama

actor LlamaFrameworkRuntime: LocalLLMRuntime {
    static let shared = LlamaFrameworkRuntime()

    nonisolated let diagnostics = LocalLLMRuntimeDiagnostics(
        state: .ready,
        title: "LlamaFramework接続済み",
        detail: "llama.cpp XCFramework を使って保存済みGGUFモデルを実行します。"
    )

    private var didInitializeBackend = false
    private var cachedModelURL: URL?
    private var cachedModelPointer: OpaquePointer?

    deinit {
        if let model = cachedModelPointer {
            llama_model_free(model)
        }
    }

    func generateText(for request: LocalLLMGenerationRequest) async throws -> String {
        try Task.checkCancellation()
        initializeBackendIfNeeded()

        let model = try loadModel(for: request)

        var contextParams = llama_context_default_params()
        contextParams.n_ctx = UInt32(request.options.contextTokens)
        contextParams.n_batch = UInt32(min(request.options.contextTokens, 512))
        contextParams.n_ubatch = UInt32(min(request.options.contextTokens, 512))
        contextParams.n_threads = Int32(max(2, ProcessInfo.processInfo.activeProcessorCount - 1))
        contextParams.n_threads_batch = contextParams.n_threads

        guard let context = llama_init_from_model(model, contextParams) else {
            throw LocalLLMGenerationError.contextCreationFailed
        }
        defer {
            llama_free(context)
        }

        let vocab = llama_model_get_vocab(model)
        let promptTokens = try tokenize(request.prompt, vocab: vocab)
        guard !promptTokens.isEmpty else {
            throw LocalLLMGenerationError.emptyPrompt
        }
        try Task.checkCancellation()

        var batch = llama_batch_init(Int32(max(promptTokens.count, 1)), 0, 1)
        defer {
            llama_batch_free(batch)
        }

        try decode(promptTokens, context: context, batch: &batch, startPosition: 0, emitLogitsForLastToken: true)

        var samplerParams = llama_sampler_chain_default_params()
        samplerParams.no_perf = true
        guard let sampler = llama_sampler_chain_init(samplerParams) else {
            throw LocalLLMGenerationError.contextCreationFailed
        }
        defer {
            llama_sampler_free(sampler)
        }

        llama_sampler_chain_add(sampler, llama_sampler_init_top_k(40))
        llama_sampler_chain_add(sampler, llama_sampler_init_top_p(Float(request.options.topP), 1))
        llama_sampler_chain_add(sampler, llama_sampler_init_temp(Float(request.options.temperature)))
        llama_sampler_chain_add(sampler, llama_sampler_init_dist(UInt32(Date().timeIntervalSince1970)))

        var generated = ""
        var nextPosition = Int32(promptTokens.count)

        for _ in 0..<request.options.maxTokens {
            try Task.checkCancellation()

            let token = llama_sampler_sample(sampler, context, -1)
            if llama_vocab_is_eog(vocab, token) {
                break
            }

            llama_sampler_accept(sampler, token)
            generated += piece(for: token, vocab: vocab)

            try decode([token], context: context, batch: &batch, startPosition: nextPosition, emitLogitsForLastToken: true)
            nextPosition += 1
        }

        return generated.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func loadModel(for request: LocalLLMGenerationRequest) throws -> OpaquePointer {
        if let cachedModelPointer, cachedModelURL == request.modelURL {
            return cachedModelPointer
        }

        if let model = cachedModelPointer {
            llama_model_free(model)
            cachedModelPointer = nil
            cachedModelURL = nil
        }

        var modelParams = llama_model_default_params()
        modelParams.n_gpu_layers = 99
        modelParams.use_mmap = true

        guard let model = request.modelURL.path.withCString({ path in
            llama_model_load_from_file(path, modelParams)
        }) else {
            throw LocalLLMGenerationError.modelLoadFailed
        }

        cachedModelURL = request.modelURL
        cachedModelPointer = model
        return model
    }

    private func initializeBackendIfNeeded() {
        guard !didInitializeBackend else {
            return
        }

        llama_backend_init()
        didInitializeBackend = true
    }

    private func tokenize(_ text: String, vocab: OpaquePointer?) throws -> [llama_token] {
        let utf8Count = text.utf8.count
        var tokens = [llama_token](repeating: 0, count: utf8Count + 8)
        let count = text.withCString { pointer in
            llama_tokenize(vocab, pointer, Int32(utf8Count), &tokens, Int32(tokens.count), true, true)
        }

        if count < 0 {
            let required = Int(-count)
            tokens = [llama_token](repeating: 0, count: required)
            let retryCount = text.withCString { pointer in
                llama_tokenize(vocab, pointer, Int32(utf8Count), &tokens, Int32(tokens.count), true, true)
            }

            guard retryCount >= 0 else {
                throw LocalLLMGenerationError.tokenizationFailed
            }

            return Array(tokens.prefix(Int(retryCount)))
        }

        return Array(tokens.prefix(Int(count)))
    }

    private func decode(
        _ tokens: [llama_token],
        context: OpaquePointer?,
        batch: inout llama_batch,
        startPosition: Int32,
        emitLogitsForLastToken: Bool
    ) throws {
        batch.n_tokens = Int32(tokens.count)

        for index in tokens.indices {
            batch.token[index] = tokens[index]
            batch.pos[index] = startPosition + Int32(index)
            batch.n_seq_id[index] = 1
            batch.seq_id[index]![0] = 0
            batch.logits[index] = emitLogitsForLastToken && index == tokens.indices.last ? 1 : 0
        }

        guard llama_decode(context, batch) == 0 else {
            throw LocalLLMGenerationError.decodeFailed
        }
    }

    private func piece(for token: llama_token, vocab: OpaquePointer?) -> String {
        var buffer = [CChar](repeating: 0, count: 256)
        let count = llama_token_to_piece(vocab, token, &buffer, Int32(buffer.count), 0, true)

        guard count > 0 else {
            return ""
        }

        return String(decoding: buffer.prefix(Int(count)).map { UInt8(bitPattern: $0) }, as: UTF8.self)
    }
}
