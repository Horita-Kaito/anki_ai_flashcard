import SwiftUI
import SwiftData

struct SettingsView: View {
    @Query private var decks: [LocalDeck]
    @Query private var notes: [LocalNoteSeed]
    @Query private var candidates: [LocalAiCardCandidate]
    @Query private var cards: [LocalCard]

    var body: some View {
        NavigationStack {
            List {
                Section("保存先") {
                    LabeledContent("モード", value: "完全ローカル")
                    LabeledContent("同期", value: "なし")
                }

                Section("ローカルデータ") {
                    LabeledContent("デッキ", value: "\(decks.count)")
                    LabeledContent("メモ", value: "\(notes.count)")
                    LabeledContent("AI候補", value: "\(candidates.count)")
                    LabeledContent("カード", value: "\(cards.count)")
                }

                Section("AI") {
                    LabeledContent("実行場所", value: "このiPhone")
                    LabeledContent("ローカルLLM", value: "未接続")
                }
            }
            .navigationTitle("設定")
        }
    }
}
