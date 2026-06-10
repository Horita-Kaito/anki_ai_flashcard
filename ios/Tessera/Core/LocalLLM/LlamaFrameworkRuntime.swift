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

    func generateText(for request: LocalLLMGenerationRequest) async throws -> String {
        try Task.checkCancellation()
        initializeBackendIfNeeded()

        let model = try loadModel(for: request)

        var contextParams = llama_context_default_params()
        contextParams.n_ctx = UInt32(request.options.contextTokens)
        let batchSize = min(request.options.contextTokens, 512)
        contextParams.n_batch = UInt32(batchSize)
        contextParams.n_ubatch = UInt32(batchSize)
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

        // プロンプト自体がコンテキスト長を超える場合は、デコードが必ず失敗するため早期に明示エラーにする。
        guard promptTokens.count < request.options.contextTokens else {
            throw LocalLLMGenerationError.contextExceeded
        }

        // 生成トークン数は「コンテキスト長 - プロンプト長」を超えられない。
        // maxTokens を独立指定できる UI と整合させ、生成途中での decode 失敗を防ぐ。
        let maxNewTokens = max(1, min(request.options.maxTokens, request.options.contextTokens - promptTokens.count))
        try Task.checkCancellation()

        // バッチは n_batch トークン分だけ確保する。プロンプトがこれを超える場合は
        // チャンク分割して順次 decode するため、バッチ自体は n_batch サイズで足りる。
        // 生成は1トークンずつ decode するので最低でも1は必要。
        var batch = llama_batch_init(Int32(max(batchSize, 1)), 0, 1)
        defer {
            llama_batch_free(batch)
        }

        // プロンプトのトークン数が n_batch を超えると llama_decode が一括では失敗するため、
        // n_batch 単位のチャンクに分割して順次 decode する。位置(pos)は通し番号で進め、
        // logits はプロンプト最後尾のトークン（=最終チャンクの末尾）でのみ生成させる。
        try decodePrompt(promptTokens, context: context, batch: &batch, batchSize: batchSize)

        var samplerParams = llama_sampler_chain_default_params()
        samplerParams.no_perf = true
        guard let sampler = llama_sampler_chain_init(samplerParams) else {
            throw LocalLLMGenerationError.contextCreationFailed
        }
        defer {
            llama_sampler_free(sampler)
        }

        // 出力をカード候補JSONの文法（GBNF）に拘束する。これにより小型モデルでも
        // 構文的に妥当なJSONだけを生成でき、パース失敗・フォールバック率を下げられる。
        // grammar は最初に適用し、許可トークンに絞った上で top_k/top_p/temp で選択する。
        // grammar 初期化に失敗した場合は拘束なしで継続する（生成自体は止めない）。
        if let grammarSampler = llama_sampler_init_grammar(vocab, LocalLLMGrammar.cardsJSON, "root") {
            llama_sampler_chain_add(sampler, grammarSampler)
        }

        llama_sampler_chain_add(sampler, llama_sampler_init_top_k(40))
        llama_sampler_chain_add(sampler, llama_sampler_init_top_p(Float(request.options.topP), 1))
        llama_sampler_chain_add(sampler, llama_sampler_init_temp(Float(request.options.temperature)))
        llama_sampler_chain_add(sampler, llama_sampler_init_dist(UInt32(Date().timeIntervalSince1970)))

        // 1トークン = 完結したUTF-8文字列とは限らない（特に日本語ではマルチバイト文字が
        // 複数トークンに分割される）。トークンごとに String 化すると不完全なバイト列が
        // U+FFFD に化けるため、生バイトを蓄積してから最後にまとめてデコードする。
        var generatedBytes: [UInt8] = []
        var nextPosition = Int32(promptTokens.count)

        for _ in 0..<maxNewTokens {
            try Task.checkCancellation()

            let token = llama_sampler_sample(sampler, context, -1)
            if llama_vocab_is_eog(vocab, token) {
                break
            }

            llama_sampler_accept(sampler, token)
            appendPiece(for: token, vocab: vocab, into: &generatedBytes)

            try decode([token], context: context, batch: &batch, startPosition: nextPosition, emitLogitsForLastToken: true)
            nextPosition += 1
        }

        let generated = String(decoding: generatedBytes, as: UTF8.self)
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

    /// プロンプト全体を n_batch 単位のチャンクに分割して順次 decode する。
    /// 最終チャンクの末尾トークンでのみ logits を生成し、その後のサンプリングに使う。
    private func decodePrompt(
        _ tokens: [llama_token],
        context: OpaquePointer?,
        batch: inout llama_batch,
        batchSize: Int
    ) throws {
        let chunkSize = max(batchSize, 1)
        var offset = 0
        while offset < tokens.count {
            try Task.checkCancellation()

            let end = min(offset + chunkSize, tokens.count)
            let chunk = Array(tokens[offset..<end])
            let isLastChunk = end == tokens.count
            try decode(
                chunk,
                context: context,
                batch: &batch,
                startPosition: Int32(offset),
                emitLogitsForLastToken: isLastChunk
            )
            offset = end
        }
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

    private func appendPiece(for token: llama_token, vocab: OpaquePointer?, into buffer: inout [UInt8]) {
        var scratch = [CChar](repeating: 0, count: 256)
        var count = llama_token_to_piece(vocab, token, &scratch, Int32(scratch.count), 0, true)

        // 256バイトに収まらない場合は必要量（-count）で再確保してから取得する。
        if count < 0 {
            scratch = [CChar](repeating: 0, count: Int(-count))
            count = llama_token_to_piece(vocab, token, &scratch, Int32(scratch.count), 0, true)
        }

        guard count > 0 else {
            return
        }

        buffer.append(contentsOf: scratch.prefix(Int(count)).map { UInt8(bitPattern: $0) })
    }
}

/// カード候補JSONの構造を強制する GBNF 文法。
/// `cards` 配列を持つオブジェクトで、各要素は question / answer / focus_type / rationale を
/// この順で必ず含む。raw 文字列リテラルで GBNF をそのまま記述する。
private enum LocalLLMGrammar {
    static let cardsJSON = #"""
    root    ::= ws "{" ws "\"cards\"" ws ":" ws "[" ws card ( ws "," ws card )* ws "]" ws "}" ws
    card    ::= "{" ws "\"question\"" ws ":" ws string ws "," ws "\"answer\"" ws ":" ws string ws "," ws "\"focus_type\"" ws ":" ws string ws "," ws "\"rationale\"" ws ":" ws string ws "}"
    string  ::= "\"" ( [^"\\] | "\\" . )* "\""
    ws      ::= [ \t\n]*
    """#
}
