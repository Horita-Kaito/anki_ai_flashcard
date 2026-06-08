import Foundation
import SwiftData

@Model
final class LocalDeck {
    @Attribute(.unique) var id: UUID
    var name: String
    var deckDescription: String?
    var displayOrder: Int
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        name: String,
        deckDescription: String? = nil,
        displayOrder: Int = 0,
        createdAt: Date = .now,
        updatedAt: Date = .now
    ) {
        self.id = id
        self.name = name
        self.deckDescription = deckDescription
        self.displayOrder = displayOrder
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

@Model
final class LocalNoteSeed {
    @Attribute(.unique) var id: UUID
    var body: String
    var learningGoal: String?
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        body: String,
        learningGoal: String? = nil,
        createdAt: Date = .now,
        updatedAt: Date = .now
    ) {
        self.id = id
        self.body = body
        self.learningGoal = learningGoal
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

@Model
final class LocalAiCardCandidate {
    @Attribute(.unique) var id: UUID
    var noteSeedId: UUID
    var question: String
    var answer: String
    var cardType: String
    var focusType: String?
    var rationale: String?
    var status: String
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        noteSeedId: UUID,
        question: String,
        answer: String,
        cardType: String = "basic_qa",
        focusType: String? = nil,
        rationale: String? = nil,
        status: String = "pending",
        createdAt: Date = .now,
        updatedAt: Date = .now
    ) {
        self.id = id
        self.noteSeedId = noteSeedId
        self.question = question
        self.answer = answer
        self.cardType = cardType
        self.focusType = focusType
        self.rationale = rationale
        self.status = status
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

@Model
final class LocalCard {
    @Attribute(.unique) var id: UUID
    var deckId: UUID
    var sourceNoteSeedId: UUID?
    var sourceAiCandidateId: UUID?
    var question: String
    var answer: String
    var explanation: String?
    var scheduler: String
    var dueAt: Date
    var repetitions: Int
    var intervalDays: Int
    var lapseCount: Int
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        deckId: UUID,
        sourceNoteSeedId: UUID? = nil,
        sourceAiCandidateId: UUID? = nil,
        question: String,
        answer: String,
        explanation: String? = nil,
        scheduler: String = "fsrs",
        dueAt: Date = .now,
        repetitions: Int = 0,
        intervalDays: Int = 0,
        lapseCount: Int = 0,
        createdAt: Date = .now,
        updatedAt: Date = .now
    ) {
        self.id = id
        self.deckId = deckId
        self.sourceNoteSeedId = sourceNoteSeedId
        self.sourceAiCandidateId = sourceAiCandidateId
        self.question = question
        self.answer = answer
        self.explanation = explanation
        self.scheduler = scheduler
        self.dueAt = dueAt
        self.repetitions = repetitions
        self.intervalDays = intervalDays
        self.lapseCount = lapseCount
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}
