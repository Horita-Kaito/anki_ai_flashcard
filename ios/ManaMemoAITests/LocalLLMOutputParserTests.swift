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
}
