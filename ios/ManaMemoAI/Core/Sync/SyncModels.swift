import Foundation

/// 同期1レコードのDTO。全エンティティの上位集合（フィールドは任意）。
/// JSONEncoder.api / JSONDecoder.api（snake_case変換）でサーバの命名と相互変換される。
/// 例: `clientId` <-> `client_id`, `deckClientId` <-> `deck_client_id`, `dueAt` <-> `due_at`。
/// 日時は .iso8601 戦略で String(ISO8601) と Date を自動変換する。
struct SyncRecord: Codable {
    let clientId: String
    var updatedAt: Date?
    var deleted: Bool?

    // deck
    var name: String?
    var description: String?
    var displayOrder: Int?

    // note_seed
    var body: String?
    var learningGoal: String?

    // candidate / card 共通
    var question: String?
    var answer: String?
    var cardType: String?
    var focusType: String?
    var rationale: String?
    var explanation: String?
    var status: String?

    // card
    var isSuspended: Bool?
    var scheduler: String?

    // card_schedule
    var repetitions: Int?
    var intervalDays: Int?
    var dueAt: Date?
    var lapseCount: Int?

    // references (client_id ベース)
    var noteSeedClientId: String?
    var deckClientId: String?
    var sourceNoteSeedClientId: String?
    var sourceAiCandidateClientId: String?
    var cardClientId: String?

    init(clientId: String) {
        self.clientId = clientId
    }
}

/// 5エンティティ分の変更束。snake_case 変換で note_seeds / ai_card_candidates / card_schedules になる。
struct SyncChanges: Codable {
    var decks: [SyncRecord] = []
    var noteSeeds: [SyncRecord] = []
    var aiCardCandidates: [SyncRecord] = []
    var cards: [SyncRecord] = []
    var cardSchedules: [SyncRecord] = []
}

struct SyncPushBody: Encodable {
    let since: String?
    let changes: SyncChanges
}

struct SyncResponse: Decodable {
    let data: SyncResponseData
}

struct SyncResponseData: Decodable {
    let cursor: String
    let changes: SyncChanges
}

/// 同期結果サマリ（UI表示用）。
struct SyncOutcome: Equatable {
    var pushed: Int
    var pulled: Int
    var deletedRemotely: Int
}
