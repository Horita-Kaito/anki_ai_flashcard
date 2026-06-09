import SwiftUI
import SwiftData

struct SettingsView: View {
    @EnvironmentObject private var session: AuthSessionStore
    @Query private var decks: [LocalDeck]
    @Query private var notes: [LocalNoteSeed]
    @Query private var candidates: [LocalAiCardCandidate]
    @Query private var cards: [LocalCard]
    @StateObject private var llmSettings = LocalLLMSettingsStore()
    @Environment(\.modelContext) private var modelContext
    @AppStorage("dailyReviewLimit") private var dailyReviewLimit = 0
    @State private var isLoginPresented = false
    @State private var isSyncing = false
    @State private var syncMessage: String?
    @State private var syncError: String?

    var body: some View {
        NavigationStack {
            List {
                Section("保存先") {
                    LabeledContent("モード", value: "ローカルファースト")
                    LabeledContent("同期", value: session.isAuthenticated ? "有効（ログイン中）" : "オプトイン（未ログイン）")
                }

                Section {
                    Stepper(value: $dailyReviewLimit, in: 0...200, step: 10) {
                        LabeledContent("1日の復習上限") {
                            Text(dailyReviewLimit == 0 ? String(localized: "無制限") : "\(dailyReviewLimit)")
                        }
                    }
                } header: {
                    Text("学習")
                } footer: {
                    Text("1回の復習で出題する枚数の上限です。0 は無制限です。")
                }

                accountSection

                Section("ローカルデータ") {
                    LabeledContent("デッキ", value: "\(decks.count)")
                    LabeledContent("メモ", value: "\(notes.count)")
                    LabeledContent("AI候補", value: "\(candidates.count)")
                    LabeledContent("カード", value: "\(cards.count)")

                    NavigationLink {
                        ExportView()
                    } label: {
                        Label("データをエクスポート", systemImage: "square.and.arrow.up")
                    }

                    NavigationLink {
                        ImportView()
                    } label: {
                        Label("データをインポート", systemImage: "tray.and.arrow.down")
                    }
                }

                Section("AI") {
                    LabeledContent("実行場所", value: "このiPhone")
                    NavigationLink {
                        LocalAISettingsView(settings: llmSettings)
                    } label: {
                        LabeledContent("ローカルLLM", value: llmSettings.selectedModel.displayName)
                    }
                }
            }
            .navigationTitle("設定")
            .sheet(isPresented: $isLoginPresented) {
                LoginView()
            }
            .onChange(of: session.isAuthenticated) { _, authenticated in
                if authenticated {
                    Task { await runSync() }
                }
            }
        }
    }

    @ViewBuilder
    private var accountSection: some View {
        Section("アカウント / 同期") {
            switch session.state {
            case .checking:
                LabeledContent("状態", value: "確認中…")
            case .signedOut:
                LabeledContent("状態", value: "未ログイン")
                Button {
                    isLoginPresented = true
                } label: {
                    Label("ログインして同期を有効化", systemImage: "person.crop.circle.badge.plus")
                }
            case .authenticated(let user):
                LabeledContent("アカウント", value: user.email)

                Button {
                    Task { await runSync() }
                } label: {
                    HStack {
                        if isSyncing {
                            ProgressView()
                        } else {
                            Image(systemName: "arrow.triangle.2.circlepath")
                        }
                        Text(isSyncing ? "同期中…" : "今すぐ同期")
                    }
                }
                .disabled(isSyncing)

                if let lastSyncedText {
                    LabeledContent("最終同期", value: lastSyncedText)
                }

                if let syncMessage {
                    InlineStatusView(.success, verbatim: syncMessage)
                }

                if let syncError {
                    InlineStatusView(.error, verbatim: syncError)
                }

                Button(role: .destructive) {
                    Task { await session.logout() }
                } label: {
                    Label("ログアウト", systemImage: "rectangle.portrait.and.arrow.right")
                }
            }

            if let errorMessage = session.errorMessage {
                InlineStatusView(.error, verbatim: errorMessage)
            }
        }
    }

    private var lastSyncedText: String? {
        // SyncService と同じ UserDefaults キー。
        let timestamp = UserDefaults.standard.double(forKey: "sync.last_synced_at")
        guard timestamp > 0 else { return nil }
        return Date(timeIntervalSince1970: timestamp).formatted(date: .abbreviated, time: .shortened)
    }

    private func runSync() async {
        guard session.isAuthenticated, !isSyncing else { return }
        isSyncing = true
        syncError = nil
        syncMessage = nil

        do {
            let service = SyncService(apiClient: session.makeAPIClient())
            let outcome = try await service.sync(context: modelContext)
            syncMessage = String(localized: "送信 \(outcome.pushed) / 受信 \(outcome.pulled) / 削除 \(outcome.deletedRemotely)")
            Haptics.success()
        } catch {
            // 同期失敗は握りつぶさず表示。ローカル操作は継続できる。
            syncError = error.localizedDescription
            Haptics.error()
        }

        isSyncing = false
    }
}
