import XCTest
@testable import ManaMemoAI

final class LocalLLMOutputParserTests: XCTestCase {
    func testParsesJSONInsideMarkdownFence() throws {
        let output = """
        ```json
        {
          "cards": [
            {
              "question": "SM-2で重要な値は？",
              "answer": "復習間隔と習熟度です。",
              "focus_type": "definition",
              "rationale": "中心概念を確認するため。"
            }
          ]
        }
        ```
        """

        let drafts = try LocalLLMOutputParser.parseCandidates(from: output)

        XCTAssertEqual(drafts.count, 1)
        XCTAssertEqual(drafts[0].question, "SM-2で重要な値は？")
        XCTAssertEqual(drafts[0].answer, "復習間隔と習熟度です。")
        XCTAssertEqual(drafts[0].focusType, "definition")
    }

    func testParsesAlternativeFlashcardKeys() throws {
        let output = """
        Before JSON
        {
          "flashcards": [
            {
              "front": "GGUFとは？",
              "back": "LLMモデルを保存するファイル形式です。"
            }
          ]
        }
        After JSON
        """

        let drafts = try LocalLLMOutputParser.parseCandidates(from: output)

        XCTAssertEqual(drafts.count, 1)
        XCTAssertEqual(drafts[0].question, "GGUFとは？")
        XCTAssertEqual(drafts[0].answer, "LLMモデルを保存するファイル形式です。")
        XCTAssertEqual(drafts[0].focusType, "basic_qa")
    }

    // 外側の cards オブジェクトと内側のカード断片の両方が抽出候補になるケース。
    // 候補順が非決定的だと内側の単一カードを誤採用して件数が崩れるため、
    // 常に外側の全カードが採用されることを（複数回実行で）確認する。
    func testPrefersOuterEnvelopeOverNestedFragmentDeterministically() throws {
        let output = """
        {
          "cards": [
            {
              "question": "FSRSとは？",
              "answer": "間隔反復のスケジューリングアルゴリズムです。",
              "focus_type": "definition",
              "rationale": "中心概念を確認するため。"
            },
            {
              "question": "復習間隔は何で決まる？",
              "answer": "難易度と安定度から計算されます。",
              "focus_type": "mechanism",
              "rationale": "仕組みを確認するため。"
            }
          ]
        }
        """

        for _ in 0..<20 {
            let drafts = try LocalLLMOutputParser.parseCandidates(from: output)
            XCTAssertEqual(drafts.count, 2)
            XCTAssertEqual(drafts[0].question, "FSRSとは？")
            XCTAssertEqual(drafts[1].question, "復習間隔は何で決まる？")
        }
    }
}

final class LocalNoteChunkerTests: XCTestCase {
    func testShortTextReturnsSingleChunk() {
        let text = "短いメモです。"
        let chunks = LocalNoteChunker.chunks(for: text, maxCharacters: 100)
        XCTAssertEqual(chunks, [text])
    }

    func testEmptyTextReturnsNoChunks() {
        XCTAssertTrue(LocalNoteChunker.chunks(for: "   \n  ", maxCharacters: 100).isEmpty)
    }

    func testSplitsLongTextBySentencesWithinBudget() {
        // 各文10文字、budget 25 → 1チャンクに2文ずつ入る想定。
        let sentences = (1...6).map { "ぶんしょうです\($0)。" } // 9〜10文字程度
        let text = sentences.joined()
        let budget = 25
        let chunks = LocalNoteChunker.chunks(for: text, maxCharacters: budget)

        XCTAssertGreaterThan(chunks.count, 1)
        for chunk in chunks {
            XCTAssertLessThanOrEqual(chunk.count, budget)
            XCTAssertFalse(chunk.isEmpty)
        }
        // 分割しても全文が保持されること（区切り文字を除いて連結が元に一致）。
        let recombined = chunks.joined().replacingOccurrences(of: "\n", with: "")
        XCTAssertEqual(recombined, text)
    }

    func testHardSplitsSentenceLongerThanBudget() {
        let text = String(repeating: "あ", count: 50) // 句点なしの長い1文
        let budget = 12
        let chunks = LocalNoteChunker.chunks(for: text, maxCharacters: budget)

        XCTAssertGreaterThan(chunks.count, 1)
        for chunk in chunks {
            XCTAssertLessThanOrEqual(chunk.count, budget)
        }
        XCTAssertEqual(chunks.joined(), text)
    }
}

/// 同期DTOのキー変換（camelCase <-> snake_case）はビルド検証できない最重要部分なので
/// 往復テストで固定する。サーバ(SyncService.php)の命名と一致している必要がある。
final class SyncModelsCodingTests: XCTestCase {
    func testRecordEncodesSnakeCaseKeysAndOmitsNil() throws {
        var record = SyncRecord(clientId: "abc")
        record.deckClientId = "deck-1"
        record.displayOrder = 3

        let json = String(decoding: try JSONEncoder.api.encode(record), as: UTF8.self)

        XCTAssertTrue(json.contains("\"client_id\""))
        XCTAssertTrue(json.contains("\"deck_client_id\""))
        XCTAssertTrue(json.contains("\"display_order\""))
        // nil フィールドは省略される（サーバ側で「未指定＝既存維持」になる）
        XCTAssertFalse(json.contains("\"question\""))
    }

    func testChangesContainersUseSnakeCaseAndRoundTrip() throws {
        var changes = SyncChanges()
        var note = SyncRecord(clientId: "n1")
        note.body = "メモ"
        changes.noteSeeds = [note]

        let data = try JSONEncoder.api.encode(changes)
        let json = String(decoding: data, as: UTF8.self)
        XCTAssertTrue(json.contains("\"note_seeds\""))

        let decoded = try JSONDecoder.api.decode(SyncChanges.self, from: data)
        XCTAssertEqual(decoded.noteSeeds.first?.clientId, "n1")
        XCTAssertEqual(decoded.noteSeeds.first?.body, "メモ")
    }

    func testResponseDecodesServerEnvelope() throws {
        let payload = """
        {"data":{"cursor":"123","changes":{"decks":[{"client_id":"d1","name":"D","deleted":false}],"note_seeds":[],"ai_card_candidates":[],"cards":[],"card_schedules":[]}}}
        """

        let response = try JSONDecoder.api.decode(SyncResponse.self, from: Data(payload.utf8))

        XCTAssertEqual(response.data.cursor, "123")
        XCTAssertEqual(response.data.changes.decks.first?.clientId, "d1")
        XCTAssertEqual(response.data.changes.decks.first?.name, "D")
        XCTAssertEqual(response.data.changes.decks.first?.deleted, false)
    }
}
