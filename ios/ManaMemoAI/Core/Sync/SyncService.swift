import Foundation
import SwiftData

/// 端末間オプトイン同期のクライアント実装。
///
/// 1リクエストで push(dirty + 削除tombstone) と pull(since以降のサーバ差分) を行う。
/// client_id はローカルの UUID をそのまま使うため、サーバ↔ローカルのID対応表は不要。
/// 競合は updatedAt(論理時刻) の Last-Write-Wins（削除も同じ規則で適用する）。
/// デッキ階層は parent_client_id でやり取りし、pull 後に親参照を二段階で解決する。
/// カーソル・最終同期時刻はログイン中ユーザー単位で名前空間を分ける（別アカウント混在防止）。
@MainActor
final class SyncService {
    private let apiClient: APIClient
    private let userDefaults: UserDefaults
    /// 同期カーソルのキー接頭辞。ユーザーIDで名前空間化する。
    private static let cursorKeyPrefix = "sync.cursor"
    /// 最終同期時刻のキー接頭辞。SettingsView と共有するため static で公開する。
    static let lastSyncedKeyPrefix = "sync.last_synced_at"
    /// このサービスが対象とするユーザー（nil は未ログイン: カーソルを共有しない）。
    private let userId: Int?

    init(apiClient: APIClient, userId: Int?, userDefaults: UserDefaults = .standard) {
        self.apiClient = apiClient
        self.userId = userId
        self.userDefaults = userDefaults
    }

    /// ユーザー単位で名前空間化したカーソルキー。
    private var cursorKey: String { Self.cursorKey(for: userId) }
    /// ユーザー単位で名前空間化した最終同期キー。
    private var lastSyncedKey: String { Self.lastSyncedKey(for: userId) }

    /// ユーザーIDを名前空間サフィックスへ変換する。未ログインは "anonymous"。
    private static func namespace(for userId: Int?) -> String {
        guard let userId else { return "anonymous" }
        return String(userId)
    }

    /// 指定ユーザーのカーソルキー。未ログイン時も衝突しないよう "anonymous" を使う。
    static func cursorKey(for userId: Int?) -> String {
        "\(cursorKeyPrefix).\(namespace(for: userId))"
    }

    /// 指定ユーザーの最終同期キー。SettingsView の表示と SyncService の保存で共有する。
    static func lastSyncedKey(for userId: Int?) -> String {
        "\(lastSyncedKeyPrefix).\(namespace(for: userId))"
    }

    /// ログアウト時に、そのユーザーの同期カーソルと最終同期時刻を破棄する。
    /// 別アカウントで再ログインした際に他人の差分カーソルを引き継がないため必須。
    static func clearCursor(for userId: Int?, userDefaults: UserDefaults = .standard) {
        userDefaults.removeObject(forKey: cursorKey(for: userId))
        userDefaults.removeObject(forKey: lastSyncedKey(for: userId))
    }

    var lastSyncedAt: Date? {
        let value = userDefaults.double(forKey: lastSyncedKey)
        return value > 0 ? Date(timeIntervalSince1970: value) : nil
    }

    private var cursor: String? {
        get { userDefaults.string(forKey: cursorKey) }
        set { userDefaults.set(newValue, forKey: cursorKey) }
    }

    func sync(context: ModelContext) async throws -> SyncOutcome {
        let gather = try gatherLocalChanges(context)

        let body = SyncPushBody(since: cursor, changes: gather.changes)
        let response: SyncResponse = try await apiClient.request("sync", method: .post, body: body)

        var pulled = 0
        var deletedRemotely = 0
        applyRemoteChanges(response.data.changes, context: context, pulled: &pulled, deletedRemotely: &deletedRemotely)

        // push 済みの dirty を解除（同期中に再編集されたものは updatedAt が変わるので除外）。
        let now = Date()
        for (model, snapshot) in gather.decks where model.updatedAt == snapshot { model.dirty = false; model.syncedAt = now }
        for (model, snapshot) in gather.notes where model.updatedAt == snapshot { model.dirty = false; model.syncedAt = now }
        for (model, snapshot) in gather.candidates where model.updatedAt == snapshot { model.dirty = false; model.syncedAt = now }
        for (model, snapshot) in gather.cards where model.updatedAt == snapshot { model.dirty = false; model.syncedAt = now }
        for tombstone in gather.tombstones { context.delete(tombstone) }

        cursor = response.data.cursor
        userDefaults.set(now.timeIntervalSince1970, forKey: lastSyncedKey)
        try context.save()

        return SyncOutcome(pushed: gather.pushedCount, pulled: pulled, deletedRemotely: deletedRemotely)
    }

    // MARK: - Gather (push payload)

    private struct LocalGather {
        var changes = SyncChanges()
        var decks: [(LocalDeck, Date)] = []
        var notes: [(LocalNoteSeed, Date)] = []
        var candidates: [(LocalAiCardCandidate, Date)] = []
        var cards: [(LocalCard, Date)] = []
        var tombstones: [LocalSyncTombstone] = []
        var pushedCount = 0
    }

    private func gatherLocalChanges(_ context: ModelContext) throws -> LocalGather {
        var gather = LocalGather()

        for deck in try context.fetch(FetchDescriptor<LocalDeck>(predicate: #Predicate { $0.dirty })) {
            gather.changes.decks.append(deckRecord(deck))
            gather.decks.append((deck, deck.updatedAt))
        }
        for note in try context.fetch(FetchDescriptor<LocalNoteSeed>(predicate: #Predicate { $0.dirty })) {
            gather.changes.noteSeeds.append(noteRecord(note))
            gather.notes.append((note, note.updatedAt))
        }
        for candidate in try context.fetch(FetchDescriptor<LocalAiCardCandidate>(predicate: #Predicate { $0.dirty })) {
            gather.changes.aiCardCandidates.append(candidateRecord(candidate))
            gather.candidates.append((candidate, candidate.updatedAt))
        }
        for card in try context.fetch(FetchDescriptor<LocalCard>(predicate: #Predicate { $0.dirty })) {
            gather.changes.cards.append(cardRecord(card))
            gather.changes.cardSchedules.append(scheduleRecord(card))
            gather.cards.append((card, card.updatedAt))
        }
        for tombstone in try context.fetch(FetchDescriptor<LocalSyncTombstone>(predicate: #Predicate { $0.dirty })) {
            appendTombstone(tombstone, to: &gather.changes)
            gather.tombstones.append(tombstone)
        }

        gather.pushedCount = gather.changes.decks.count
            + gather.changes.noteSeeds.count
            + gather.changes.aiCardCandidates.count
            + gather.changes.cards.count
        return gather
    }

    private func deckRecord(_ deck: LocalDeck) -> SyncRecord {
        var record = SyncRecord(clientId: deck.id.uuidString)
        record.updatedAt = deck.updatedAt
        record.name = deck.name
        record.description = deck.deckDescription
        record.displayOrder = deck.displayOrder
        // 親デッキは clientId(=UUID) で送り、サーバ側で FK へ解決させる。nil はトップレベル。
        record.parentClientId = deck.parentDeckId?.uuidString
        return record
    }

    private func noteRecord(_ note: LocalNoteSeed) -> SyncRecord {
        var record = SyncRecord(clientId: note.id.uuidString)
        record.updatedAt = note.updatedAt
        record.body = note.body
        record.learningGoal = note.learningGoal
        return record
    }

    private func candidateRecord(_ candidate: LocalAiCardCandidate) -> SyncRecord {
        var record = SyncRecord(clientId: candidate.id.uuidString)
        record.updatedAt = candidate.updatedAt
        record.noteSeedClientId = candidate.noteSeedId.uuidString
        record.question = candidate.question
        record.answer = candidate.answer
        record.cardType = candidate.cardType
        record.focusType = candidate.focusType
        record.rationale = candidate.rationale
        record.status = candidate.status
        return record
    }

    private func cardRecord(_ card: LocalCard) -> SyncRecord {
        var record = SyncRecord(clientId: card.id.uuidString)
        record.updatedAt = card.updatedAt
        record.deckClientId = card.deckId.uuidString
        record.sourceNoteSeedClientId = card.sourceNoteSeedId?.uuidString
        record.sourceAiCandidateClientId = card.sourceAiCandidateId?.uuidString
        record.question = card.question
        record.answer = card.answer
        record.explanation = card.explanation
        record.scheduler = card.scheduler
        record.isSuspended = card.isSuspended
        return record
    }

    /// card_schedules は iOS では LocalCard に内包。card と同じ client_id で別レコードとして送る。
    private func scheduleRecord(_ card: LocalCard) -> SyncRecord {
        var record = SyncRecord(clientId: card.id.uuidString)
        record.updatedAt = card.updatedAt
        record.cardClientId = card.id.uuidString
        record.repetitions = card.repetitions
        record.intervalDays = card.intervalDays
        record.dueAt = card.dueAt
        record.lapseCount = card.lapseCount
        return record
    }

    private func appendTombstone(_ tombstone: LocalSyncTombstone, to changes: inout SyncChanges) {
        var record = SyncRecord(clientId: tombstone.clientId.uuidString)
        record.updatedAt = tombstone.updatedAt
        record.deleted = true

        switch tombstone.entity {
        case SyncEntity.decks:
            changes.decks.append(record)
        case SyncEntity.noteSeeds:
            changes.noteSeeds.append(record)
        case SyncEntity.candidates:
            changes.aiCardCandidates.append(record)
        case SyncEntity.cards:
            changes.cards.append(record)
            var schedule = SyncRecord(clientId: tombstone.clientId.uuidString)
            schedule.updatedAt = tombstone.updatedAt
            schedule.deleted = true
            changes.cardSchedules.append(schedule)
        default:
            break
        }
    }

    // MARK: - Apply (pull payload)

    private func applyRemoteChanges(
        _ changes: SyncChanges,
        context: ModelContext,
        pulled: inout Int,
        deletedRemotely: inout Int
    ) {
        // デッキは二段階で適用する: まず全件を本体だけ適用し、その後で親参照を解決する。
        // 同一バッチ内で親が子より後に届くケースでも階層を正しく組めるようにするため。
        for record in changes.decks { applyDeck(record, context, &pulled, &deletedRemotely) }
        resolveDeckParents(changes.decks, context)
        for record in changes.noteSeeds { applyNote(record, context, &pulled, &deletedRemotely) }
        for record in changes.aiCardCandidates { applyCandidate(record, context, &pulled, &deletedRemotely) }
        for record in changes.cards { applyCard(record, context, &pulled, &deletedRemotely) }
        for record in changes.cardSchedules { applySchedule(record, context) }
    }

    private func applyDeck(_ record: SyncRecord, _ context: ModelContext, _ pulled: inout Int, _ deletedRemotely: inout Int) {
        guard let id = UUID(uuidString: record.clientId) else { return }
        let existing = fetchDeck(id, context)

        if record.deleted == true {
            // 削除も LWW: 既存行より新しい削除のときだけ反映する。
            if let existing, isNewer(record.updatedAt, than: existing.updatedAt) {
                context.delete(existing)
                deletedRemotely += 1
            }
            return
        }

        let incoming = record.updatedAt ?? Date()
        if let existing {
            if existing.updatedAt >= incoming { return }
            existing.name = record.name ?? existing.name
            existing.deckDescription = record.description
            existing.displayOrder = record.displayOrder ?? existing.displayOrder
            existing.updatedAt = incoming
            existing.dirty = false
            existing.syncedAt = Date()
        } else {
            let deck = LocalDeck(
                id: id,
                name: record.name ?? "",
                deckDescription: record.description,
                displayOrder: record.displayOrder ?? 0,
                updatedAt: incoming,
                dirty: false,
                syncedAt: Date()
            )
            context.insert(deck)
        }
        // 親参照は本体適用後に resolveDeckParents() でまとめて解決する。
        pulled += 1
    }

    /// pull された全デッキの親参照(parent_client_id)を、本体適用後にまとめて解決する。
    /// 親が同一バッチ内に後から届いても、この段階では既に挿入済みのため確実に解決できる。
    private func resolveDeckParents(_ records: [SyncRecord], _ context: ModelContext) {
        for record in records where record.deleted != true {
            guard let id = UUID(uuidString: record.clientId), let deck = fetchDeck(id, context) else { continue }
            let resolvedParent = record.parentClientId.flatMap(UUID.init)
            // 親が未到着で解決できない場合は既存の親参照を温存する（次回同期で解決）。
            if record.parentClientId != nil, resolvedParent == nil { continue }
            // 解決できた値（nil=トップレベル含む）を適用。dirty は立てない（pull 由来のため）。
            deck.parentDeckId = resolvedParent
        }
    }

    /// 受信した削除/更新時刻が既存行より新しいか（LWW 判定）。受信側 nil は最新扱い。
    private func isNewer(_ incoming: Date?, than current: Date) -> Bool {
        guard let incoming else { return true }
        return incoming > current
    }

    private func applyNote(_ record: SyncRecord, _ context: ModelContext, _ pulled: inout Int, _ deletedRemotely: inout Int) {
        guard let id = UUID(uuidString: record.clientId) else { return }
        let existing = fetchNote(id, context)

        if record.deleted == true {
            if let existing, isNewer(record.updatedAt, than: existing.updatedAt) {
                context.delete(existing)
                deletedRemotely += 1
            }
            return
        }

        let incoming = record.updatedAt ?? Date()
        if let existing {
            if existing.updatedAt >= incoming { return }
            existing.body = record.body ?? existing.body
            existing.learningGoal = record.learningGoal
            existing.updatedAt = incoming
            existing.dirty = false
            existing.syncedAt = Date()
        } else {
            let note = LocalNoteSeed(
                id: id,
                body: record.body ?? "",
                learningGoal: record.learningGoal,
                updatedAt: incoming,
                dirty: false,
                syncedAt: Date()
            )
            context.insert(note)
        }
        pulled += 1
    }

    private func applyCandidate(_ record: SyncRecord, _ context: ModelContext, _ pulled: inout Int, _ deletedRemotely: inout Int) {
        guard let id = UUID(uuidString: record.clientId) else { return }
        let existing = fetchCandidate(id, context)

        if record.deleted == true {
            if let existing, isNewer(record.updatedAt, than: existing.updatedAt) {
                context.delete(existing)
                deletedRemotely += 1
            }
            return
        }

        guard let noteSeedId = record.noteSeedClientId.flatMap(UUID.init) else { return }
        let incoming = record.updatedAt ?? Date()
        if let existing {
            if existing.updatedAt >= incoming { return }
            existing.noteSeedId = noteSeedId
            existing.question = record.question ?? existing.question
            existing.answer = record.answer ?? existing.answer
            existing.cardType = record.cardType ?? existing.cardType
            existing.focusType = record.focusType
            existing.rationale = record.rationale
            existing.status = record.status ?? existing.status
            existing.updatedAt = incoming
            existing.dirty = false
            existing.syncedAt = Date()
        } else {
            let candidate = LocalAiCardCandidate(
                id: id,
                noteSeedId: noteSeedId,
                question: record.question ?? "",
                answer: record.answer ?? "",
                cardType: record.cardType ?? "basic_qa",
                focusType: record.focusType,
                rationale: record.rationale,
                status: record.status ?? "pending",
                updatedAt: incoming,
                dirty: false,
                syncedAt: Date()
            )
            context.insert(candidate)
        }
        pulled += 1
    }

    private func applyCard(_ record: SyncRecord, _ context: ModelContext, _ pulled: inout Int, _ deletedRemotely: inout Int) {
        guard let id = UUID(uuidString: record.clientId) else { return }
        let existing = fetchCard(id, context)

        if record.deleted == true {
            if let existing, isNewer(record.updatedAt, than: existing.updatedAt) {
                context.delete(existing)
                deletedRemotely += 1
            }
            return
        }

        guard let deckId = record.deckClientId.flatMap(UUID.init) else { return }
        let incoming = record.updatedAt ?? Date()
        if let existing {
            if existing.updatedAt >= incoming { return }
            existing.deckId = deckId
            existing.sourceNoteSeedId = record.sourceNoteSeedClientId.flatMap(UUID.init)
            existing.sourceAiCandidateId = record.sourceAiCandidateClientId.flatMap(UUID.init)
            existing.question = record.question ?? existing.question
            existing.answer = record.answer ?? existing.answer
            existing.explanation = record.explanation
            existing.scheduler = record.scheduler ?? existing.scheduler
            existing.isSuspended = record.isSuspended ?? existing.isSuspended
            existing.updatedAt = incoming
            existing.dirty = false
            existing.syncedAt = Date()
        } else {
            let card = LocalCard(
                id: id,
                deckId: deckId,
                sourceNoteSeedId: record.sourceNoteSeedClientId.flatMap(UUID.init),
                sourceAiCandidateId: record.sourceAiCandidateClientId.flatMap(UUID.init),
                question: record.question ?? "",
                answer: record.answer ?? "",
                explanation: record.explanation,
                scheduler: record.scheduler ?? "fsrs",
                isSuspended: record.isSuspended ?? false,
                updatedAt: incoming,
                dirty: false,
                syncedAt: Date()
            )
            context.insert(card)
        }
        pulled += 1
    }

    /// card_schedule は対応する LocalCard のスケジュール項目へ反映する（card は cards 段で適用済み）。
    private func applySchedule(_ record: SyncRecord, _ context: ModelContext) {
        let cardId = record.cardClientId.flatMap(UUID.init) ?? UUID(uuidString: record.clientId)
        guard let cardId, let card = fetchCard(cardId, context) else { return }
        if record.deleted == true { return }

        let incoming = record.updatedAt ?? Date()
        // card 本体が LWW で更新された場合のみスケジュールも適用（整合性維持）。
        if card.updatedAt > incoming { return }

        card.repetitions = record.repetitions ?? card.repetitions
        card.intervalDays = record.intervalDays ?? card.intervalDays
        card.dueAt = record.dueAt ?? card.dueAt
        card.lapseCount = record.lapseCount ?? card.lapseCount
    }

    // MARK: - Fetch helpers

    private func fetchDeck(_ id: UUID, _ context: ModelContext) -> LocalDeck? {
        try? context.fetch(FetchDescriptor<LocalDeck>(predicate: #Predicate { $0.id == id })).first
    }

    private func fetchNote(_ id: UUID, _ context: ModelContext) -> LocalNoteSeed? {
        try? context.fetch(FetchDescriptor<LocalNoteSeed>(predicate: #Predicate { $0.id == id })).first
    }

    private func fetchCandidate(_ id: UUID, _ context: ModelContext) -> LocalAiCardCandidate? {
        try? context.fetch(FetchDescriptor<LocalAiCardCandidate>(predicate: #Predicate { $0.id == id })).first
    }

    private func fetchCard(_ id: UUID, _ context: ModelContext) -> LocalCard? {
        try? context.fetch(FetchDescriptor<LocalCard>(predicate: #Predicate { $0.id == id })).first
    }
}
