import Foundation
import Combine

@MainActor
final class LocalLLMSettingsStore: ObservableObject {
    @Published var selectedModelId: String {
        didSet {
            userDefaults.set(selectedModelId, forKey: selectedModelIdKey)
        }
    }

    @Published var usesRuleBasedFallback: Bool {
        didSet {
            userDefaults.set(usesRuleBasedFallback, forKey: usesRuleBasedFallbackKey)
        }
    }

    @Published var maxTokens: Int {
        didSet {
            userDefaults.set(maxTokens, forKey: maxTokensKey)
        }
    }

    @Published var temperature: Double {
        didSet {
            userDefaults.set(temperature, forKey: temperatureKey)
        }
    }

    @Published var topP: Double {
        didSet {
            userDefaults.set(topP, forKey: topPKey)
        }
    }

    @Published var contextTokens: Int {
        didSet {
            userDefaults.set(contextTokens, forKey: contextTokensKey)
        }
    }

    private let userDefaults: UserDefaults
    private let selectedModelIdKey = "local_llm.selected_model_id"
    private let usesRuleBasedFallbackKey = "local_llm.uses_rule_based_fallback"
    private let maxTokensKey = "local_llm.max_tokens"
    private let temperatureKey = "local_llm.temperature"
    private let topPKey = "local_llm.top_p"
    private let contextTokensKey = "local_llm.context_tokens"

    init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
        let savedModelId = userDefaults.string(forKey: selectedModelIdKey)
        selectedModelId = savedModelId ?? LocalLLMModelCatalog.defaultModelId
        usesRuleBasedFallback = userDefaults.object(forKey: usesRuleBasedFallbackKey) as? Bool ?? true
        let savedMaxTokens = userDefaults.integer(forKey: maxTokensKey)
        maxTokens = savedMaxTokens == 0 ? LocalLLMGenerationOptions.default.maxTokens : savedMaxTokens
        temperature = userDefaults.object(forKey: temperatureKey) as? Double ?? LocalLLMGenerationOptions.default.temperature
        topP = userDefaults.object(forKey: topPKey) as? Double ?? LocalLLMGenerationOptions.default.topP
        let savedContextTokens = userDefaults.integer(forKey: contextTokensKey)
        contextTokens = savedContextTokens == 0 ? LocalLLMGenerationOptions.default.contextTokens : savedContextTokens
    }

    var selectedModel: LocalLLMModelSpec {
        LocalLLMModelCatalog.model(id: selectedModelId)
    }

    var generationOptions: LocalLLMGenerationOptions {
        LocalLLMGenerationOptions(
            maxTokens: maxTokens,
            temperature: temperature,
            topP: topP,
            contextTokens: min(contextTokens, selectedModel.contextTokens)
        )
    }
}
