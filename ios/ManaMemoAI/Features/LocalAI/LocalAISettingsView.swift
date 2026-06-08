import SwiftUI

struct LocalAISettingsView: View {
    @ObservedObject var settings: LocalLLMSettingsStore
    @StateObject private var modelStore = LocalLLMModelStore()

    private let runtimeDiagnostics = LlamaFrameworkRuntime.shared.diagnostics

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

            Section("生成") {
                Stepper("最大トークン \(settings.maxTokens)", value: $settings.maxTokens, in: 256...2048, step: 128)

                VStack(alignment: .leading, spacing: 8) {
                    LabeledContent("温度", value: String(format: "%.1f", settings.temperature))
                    Slider(value: $settings.temperature, in: 0.0...1.0, step: 0.1)
                }

                VStack(alignment: .leading, spacing: 8) {
                    LabeledContent("Top P", value: String(format: "%.1f", settings.topP))
                    Slider(value: $settings.topP, in: 0.1...1.0, step: 0.1)
                }

                Stepper(
                    "コンテキスト \(settings.contextTokens)",
                    value: $settings.contextTokens,
                    in: 1024...settings.selectedModel.contextTokens,
                    step: 512
                )
            }

            Section("状態") {
                runtimeStateRow
                Text(runtimeDiagnostics.detail)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                modelStateRow
            }

            Section("モデルファイル") {
                LabeledContent("保存先", value: modelStore.localURL(for: settings.selectedModel).lastPathComponent)

                switch modelStore.state {
                case .downloaded(_, let byteCount):
                    LabeledContent("保存済み容量", value: byteFormatter.string(fromByteCount: byteCount))
                    Button("モデルを削除", role: .destructive) {
                        modelStore.delete(settings.selectedModel)
                    }
                case .invalid(_, let reason, let byteCount):
                    VStack(alignment: .leading, spacing: 8) {
                        Label(reason, systemImage: "exclamationmark.triangle")
                            .foregroundStyle(.red)
                        Text("保存済み容量: \(byteFormatter.string(fromByteCount: byteCount))")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        Button("削除して再ダウンロード", role: .destructive) {
                            modelStore.delete(settings.selectedModel)
                            modelStore.download(settings.selectedModel)
                        }
                        .disabled(settings.selectedModel.downloadURL == nil)
                    }
                case .downloading(let progress):
                    VStack(alignment: .leading, spacing: 10) {
                        ProgressView(value: progress.fractionCompleted) {
                            Text("ダウンロード中 \(progress.percentage)%")
                        }
                        Text(downloadProgressText(progress))
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        Button("ダウンロードを停止", role: .cancel) {
                            modelStore.cancelDownload(for: settings.selectedModel)
                        }
                    }
                case .missing, .failed:
                    Button {
                        modelStore.download(settings.selectedModel)
                    } label: {
                        Label("モデルをダウンロード", systemImage: "icloud.and.arrow.down")
                    }
                    .disabled(settings.selectedModel.downloadURL == nil)
                }
            }
        }
        .navigationTitle("ローカルAI")
        .onAppear {
            modelStore.refresh(for: settings.selectedModel)
        }
        .onChange(of: settings.selectedModelId) {
            modelStore.refresh(for: settings.selectedModel)
        }
    }

    private var runtimeStateRow: some View {
        Label(runtimeDiagnostics.title, systemImage: "cpu")
            .foregroundStyle(runtimeDiagnostics.state == .ready ? .green : .secondary)
    }

    @ViewBuilder
    private var modelStateRow: some View {
        switch modelStore.state {
        case .missing:
            Label("モデル未ダウンロード", systemImage: "icloud.and.arrow.down")
                .foregroundStyle(.secondary)
        case .downloaded:
            Label("モデル保存済み", systemImage: "checkmark.circle")
                .foregroundStyle(.green)
        case .invalid(_, let reason, _):
            Label(reason, systemImage: "exclamationmark.triangle")
                .foregroundStyle(.red)
        case .downloading(let progress):
            Label("ダウンロード中 \(progress.percentage)%", systemImage: "arrow.down.circle")
                .foregroundStyle(.secondary)
        case .failed(let message):
            Label(message, systemImage: "exclamationmark.triangle")
                .foregroundStyle(.red)
        }
    }

    private func downloadProgressText(_ progress: LocalLLMModelStore.DownloadProgress) -> String {
        let completed = byteFormatter.string(fromByteCount: progress.completedBytes)
        guard progress.totalBytes > 0 else {
            return "\(completed) 取得済み"
        }

        let total = byteFormatter.string(fromByteCount: progress.totalBytes)
        return "\(completed) / \(total)"
    }

    private var byteFormatter: ByteCountFormatter {
        let formatter = ByteCountFormatter()
        formatter.allowedUnits = [.useMB, .useGB]
        formatter.countStyle = .file
        return formatter
    }
}
