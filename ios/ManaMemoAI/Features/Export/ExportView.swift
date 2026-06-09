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

// MARK: - エクスポート用 DTO（SwiftData モデルとは独立した安定スキーマ）

private struct ExportPayload: Codable {
    let version: Int
    let decks: [DeckExport]
    let cards: [CardExport]
    let notes: [NoteExport]
}

private struct DeckExport: Codable {
    let id: UUID
    let name: String
    let description: String?
    let displayOrder: Int
    let parentDeckId: UUID?

    init(_ deck: LocalDeck) {
        id = deck.id
        name = deck.name
        description = deck.deckDescription
        displayOrder = deck.displayOrder
        parentDeckId = deck.parentDeckId
    }
}

private struct CardExport: Codable {
    let id: UUID
    let deckId: UUID
    let question: String
    let answer: String
    let explanation: String?
    let dueAt: Date
    let repetitions: Int
    let intervalDays: Int
    let lapseCount: Int
    let isSuspended: Bool

    init(_ card: LocalCard) {
        id = card.id
        deckId = card.deckId
        question = card.question
        answer = card.answer
        explanation = card.explanation
        dueAt = card.dueAt
        repetitions = card.repetitions
        intervalDays = card.intervalDays
        lapseCount = card.lapseCount
        isSuspended = card.isSuspended
    }
}

private struct NoteExport: Codable {
    let id: UUID
    let body: String
    let learningGoal: String?

    init(_ note: LocalNoteSeed) {
        id = note.id
        body = note.body
        learningGoal = note.learningGoal
    }
}
