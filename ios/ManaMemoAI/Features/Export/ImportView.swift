import SwiftUI
import SwiftData
import UniformTypeIdentifiers

/// エクスポートした JSON を取り込む画面。既存IDと重複する項目はスキップする（非破壊マージ）。
struct ImportView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var isPickerPresented = false
    @State private var status: Status?

    /// このアプリが取り込めるエクスポート形式の最大バージョン。
    private static let supportedVersion = 1

    private enum Status {
        case success(decks: Int, cards: Int, notes: Int)
        case skipped
        case failure(String)
    }

    var body: some View {
        List {
            Section {
                Button {
                    isPickerPresented = true
                } label: {
                    Label("ファイルを選択", systemImage: "tray.and.arrow.down")
                }
            } footer: {
                Text("エクスポートした JSON ファイルを読み込みます。既存のIDと重複する項目はスキップされます。")
            }

            if let status {
                Section {
                    switch status {
                    case let .success(decks, cards, notes):
                        InlineStatusView(.success, verbatim: String(localized: "デッキ \(decks) / カード \(cards) / メモ \(notes) を取り込みました"))
                    case .skipped:
                        InlineStatusView(.success, verbatim: String(localized: "すべて重複のためスキップされました"))
                    case let .failure(message):
                        InlineStatusView(.error, verbatim: message)
                    }
                }
            }
        }
        .navigationTitle("インポート")
        .navigationBarTitleDisplayMode(.inline)
        .fileImporter(isPresented: $isPickerPresented, allowedContentTypes: [.json]) { result in
            switch result {
            case .success(let url):
                importFile(at: url)
            case .failure(let error):
                status = .failure(error.localizedDescription)
            }
        }
    }

    private func importFile(at url: URL) {
        let didAccess = url.startAccessingSecurityScopedResource()
        defer {
            if didAccess { url.stopAccessingSecurityScopedResource() }
        }

        do {
            let data = try Data(contentsOf: url)
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            let payload = try decoder.decode(ExportPayload.self, from: data)

            // 対応バージョンより新しいファイルは互換性が保証できないため取り込まない。
            guard payload.version <= Self.supportedVersion else {
                status = .failure(String(localized: "このファイルは新しいバージョン（\(payload.version)）で作成されています。アプリを更新してから取り込んでください。"))
                Haptics.error()
                return
            }

            let outcome = merge(payload)
            if outcome.decks == 0 && outcome.cards == 0 && outcome.notes == 0 {
                // 取り込み対象がすべて既存IDと重複していた場合の案内。
                status = .skipped
            } else {
                status = .success(decks: outcome.decks, cards: outcome.cards, notes: outcome.notes)
            }
            Haptics.success()
        } catch {
            status = .failure(error.localizedDescription)
            Haptics.error()
        }
    }

    // 既存IDと重複しない項目だけ挿入する非破壊マージ。
    private func merge(_ payload: ExportPayload) -> (decks: Int, cards: Int, notes: Int) {
        let existingDeckIds = Set((try? modelContext.fetch(FetchDescriptor<LocalDeck>()))?.map(\.id) ?? [])
        let existingCardIds = Set((try? modelContext.fetch(FetchDescriptor<LocalCard>()))?.map(\.id) ?? [])
        let existingNoteIds = Set((try? modelContext.fetch(FetchDescriptor<LocalNoteSeed>()))?.map(\.id) ?? [])

        var deckCount = 0
        var cardCount = 0
        var noteCount = 0

        for deck in payload.decks where !existingDeckIds.contains(deck.id) {
            modelContext.insert(deck.makeModel())
            deckCount += 1
        }
        for card in payload.cards where !existingCardIds.contains(card.id) {
            modelContext.insert(card.makeModel())
            cardCount += 1
        }
        for note in payload.notes where !existingNoteIds.contains(note.id) {
            modelContext.insert(note.makeModel())
            noteCount += 1
        }

        return (deckCount, cardCount, noteCount)
    }
}
