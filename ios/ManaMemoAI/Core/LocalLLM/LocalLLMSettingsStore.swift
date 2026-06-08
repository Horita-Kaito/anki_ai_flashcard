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

    private let userDefaults: UserDefaults
    private let selectedModelIdKey = "local_llm.selected_model_id"
    private let usesRuleBasedFallbackKey = "local_llm.uses_rule_based_fallback"

    init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
        let savedModelId = userDefaults.string(forKey: selectedModelIdKey)
        selectedModelId = savedModelId ?? LocalLLMModelCatalog.defaultModelId
        usesRuleBasedFallback = userDefaults.object(forKey: usesRuleBasedFallbackKey) as? Bool ?? true
    }

    var selectedModel: LocalLLMModelSpec {
        LocalLLMModelCatalog.model(id: selectedModelId)
    }
}
