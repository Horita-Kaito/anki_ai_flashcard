import Foundation

/// エクスポート／インポートで共有する安定スキーマ。SwiftData モデルとは独立に保つ。
struct ExportPayload: Codable {
    let version: Int
    let decks: [DeckExport]
    let cards: [CardExport]
    let notes: [NoteExport]
}

struct DeckExport: Codable {
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

    func makeModel() -> LocalDeck {
        LocalDeck(
            id: id,
            name: name,
            deckDescription: description,
            displayOrder: displayOrder,
            parentDeckId: parentDeckId
        )
    }
}

struct CardExport: Codable {
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

    func makeModel() -> LocalCard {
        LocalCard(
            id: id,
            deckId: deckId,
            question: question,
            answer: answer,
            explanation: explanation,
            dueAt: dueAt,
            repetitions: repetitions,
            intervalDays: intervalDays,
            lapseCount: lapseCount,
            isSuspended: isSuspended
        )
    }
}

struct NoteExport: Codable {
    let id: UUID
    let body: String
    let learningGoal: String?

    init(_ note: LocalNoteSeed) {
        id = note.id
        body = note.body
        learningGoal = note.learningGoal
    }

    func makeModel() -> LocalNoteSeed {
        LocalNoteSeed(id: id, body: body, learningGoal: learningGoal)
    }
}
