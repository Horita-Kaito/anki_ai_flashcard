import SwiftUI

struct LocalAISettingsView: View {
    @ObservedObject var settings: LocalLLMSettingsStore

    var body: some View {
        List {
            Section("モデル") {
                Picker("使用モデル", selection: $settings.selectedModelId) {
                    ForEach(LocalLLMModelCatalog.models) { model in
                        Text(model.displayName)
                            .tag(model.id)
                    }
                }

                Toggle("フォールバック生成", isOn: $settings.usesRuleBasedFallback)
            }

            Section("選択中") {
                LabeledContent("ファイル", value: settings.selectedModel.fileName)
                LabeledContent("量子化", value: settings.selectedModel.quantization)
                LabeledContent("規模", value: settings.selectedModel.parameterCount)
                LabeledContent("容量目安", value: String(format: "%.1f GB", settings.selectedModel.approximateSizeGB))
                LabeledContent("必要メモリ目安", value: "\(settings.selectedModel.minimumMemoryGB) GB")
                LabeledContent("コンテキスト", value: "\(settings.selectedModel.contextTokens)")
            }

            Section("状態") {
                Label("ランタイム未接続", systemImage: "cpu")
                Label("モデル未ダウンロード", systemImage: "icloud.and.arrow.down")
            }
        }
        .navigationTitle("ローカルAI")
    }
}
