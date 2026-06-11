import Foundation
import SwiftData

/// 同期メタデータを持つローカルモデルの共通インターフェース。
/// 編集時は markDirty() を呼び、updatedAt(=LWWの論理時刻) と dirty(=push対象) を同時に立てる。
protocol SyncTrackable: AnyObject {
    var dirty: Bool { get set }
    var updatedAt: Date { get set }
}

extension SyncTrackable {
    func markDirty(now: Date = .now) {
        updatedAt = now
        dirty = true
    }
}

@Model
final class LocalDeck: SyncTrackable {
    @Attribute(.unique) var id: UUID
    var name: String
    var deckDescription: String?
    var displayOrder: Int
    // 親デッキの id。nil はトップレベル。デッキの階層構造を表す。
    // 追加の optional プロパティなので SwiftData の軽量マイグレーションで自動追従する。
    var parentDeckId: UUID?
    var createdAt: Date
    var updatedAt: Date
    var dirty: Bool
    var syncedAt: Date?

    init(
        id: UUID = UUID(),
        name: String,
        deckDescription: String? = nil,
        displayOrder: Int = 0,
        parentDeckId: UUID? = nil,
        createdAt: Date = .now,
        updatedAt: Date = .now,
        dirty: Bool = true,
        syncedAt: Date? = nil
    ) {
        self.id = id
        self.name = name
        self.deckDescription = deckDescription
        self.displayOrder = displayOrder
        self.parentDeckId = parentDeckId
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.dirty = dirty
        self.syncedAt = syncedAt
    }
}

@Model
final class LocalNoteSeed: SyncTrackable {
    @Attribute(.unique) var id: UUID
    var body: String
    var learningGoal: String?
    var createdAt: Date
    var updatedAt: Date
    var dirty: Bool
    var syncedAt: Date?

    init(
        id: UUID = UUID(),
        body: String,
        learningGoal: String? = nil,
        createdAt: Date = .now,
        updatedAt: Date = .now,
        dirty: Bool = true,
        syncedAt: Date? = nil
    ) {
        self.id = id
        self.body = body
        self.learningGoal = learningGoal
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.dirty = dirty
        self.syncedAt = syncedAt
    }
}

@Model
final class LocalAiCardCandidate: SyncTrackable {
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
    var dirty: Bool
    var syncedAt: Date?

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
        updatedAt: Date = .now,
        dirty: Bool = true,
        syncedAt: Date? = nil
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
        self.dirty = dirty
        self.syncedAt = syncedAt
    }
}

@Model
final class LocalCard: SyncTrackable {
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
    // 一時停止中のカードは復習キューから除外する。
    // 追加プロパティ（既定 false）なので SwiftData の軽量マイグレーションで自動追従する。
    var isSuspended: Bool
    // スケジュール項目 (repetitions/intervalDays/dueAt/lapseCount) 専用の論理時刻。
    // カード本文の updatedAt と分離することで、本文編集がサーバー側の復習結果の
    // 同期をブロックしない (LWW をエンティティ別に行う)。nil は未復習 (本文時刻で代用)。
    // 追加の optional プロパティなので SwiftData の軽量マイグレーションで自動追従する。
    var scheduleUpdatedAt: Date?
    var createdAt: Date
    var updatedAt: Date
    var dirty: Bool
    var syncedAt: Date?

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
        isSuspended: Bool = false,
        scheduleUpdatedAt: Date? = nil,
        createdAt: Date = .now,
        updatedAt: Date = .now,
        dirty: Bool = true,
        syncedAt: Date? = nil
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
        self.isSuspended = isSuspended
        self.scheduleUpdatedAt = scheduleUpdatedAt
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.dirty = dirty
        self.syncedAt = syncedAt
    }
}

/// ローカルで削除したレコードの墓標。push 時に deleted=true として送る。
/// entity は同期キー（"decks" / "note_seeds" / "ai_card_candidates" / "cards"）。
@Model
final class LocalSyncTombstone {
    @Attribute(.unique) var id: UUID
    var entity: String
    var clientId: UUID
    var updatedAt: Date
    var dirty: Bool

    init(
        id: UUID = UUID(),
        entity: String,
        clientId: UUID,
        updatedAt: Date = .now,
        dirty: Bool = true
    ) {
        self.id = id
        self.entity = entity
        self.clientId = clientId
        self.updatedAt = updatedAt
        self.dirty = dirty
    }
}

/// 同期エンティティ名の定数。LocalSyncTombstone.entity と SyncService のキーに使う。
enum SyncEntity {
    static let decks = "decks"
    static let noteSeeds = "note_seeds"
    static let candidates = "ai_card_candidates"
    static let cards = "cards"
}

extension ModelContext {
    /// 墓標を記録してから物理削除する。削除を端末間へ伝播させるため必ずこちらを使う。
    func deleteTracked(entity: String, clientId: UUID, model: any PersistentModel) {
        insert(LocalSyncTombstone(entity: entity, clientId: clientId))
        delete(model)
    }
}
