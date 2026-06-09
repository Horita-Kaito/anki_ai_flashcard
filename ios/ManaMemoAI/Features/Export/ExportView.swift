import SwiftUI
import SwiftData

/// デッキ・カード・メモを JSON ファイルに書き出し、共有シートで共有する画面。
/// ローカルファースト設計のバックアップ／別端末移行手段。
struct ExportView: View {
    @Query private var decks: [LocalDeck]
    @Query private var cards: [LocalCard]
    @Query private var notes: [LocalNoteSeed]

    @State private var exportURL: URL?
    @State private var errorMessage: String?

    var body: some View {
        List {
            Section("内容") {
                LabeledContent("デッキ", value: "\(decks.count)")
                LabeledContent("カード", value: "\(cards.count)")
                LabeledContent("メモ", value: "\(notes.count)")
            }

            Section {
                if let exportURL {
                    ShareLink(item: exportURL) {
                        Label("エクスポートを共有", systemImage: "square.and.arrow.up")
                    }
                } else if let errorMessage {
                    InlineStatusView(.error, verbatim: errorMessage)
                } else {
                    LabeledProgressView("エクスポートを準備中…")
                }
            } footer: {
                Text("デッキ・カード・メモを JSON ファイルに書き出します。バックアップや別端末への移行に利用できます。")
            }
        }
        .navigationTitle("エクスポート")
        .navigationBarTitleDisplayMode(.inline)
        .task { buildExport() }
    }

    private func buildExport() {
        do {
            let payload = ExportPayload(
                version: 1,
                decks: decks.map(DeckExport.init),
                cards: cards.map(CardExport.init),
                notes: notes.map(NoteExport.init)
            )
            let encoder = JSONEncoder()
            encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
            encoder.dateEncodingStrategy = .iso8601
            let data = try encoder.encode(payload)
            let url = FileManager.default.temporaryDirectory
                .appendingPathComponent("manamemo-export.json")
            try data.write(to: url, options: .atomic)
            exportURL = url
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
