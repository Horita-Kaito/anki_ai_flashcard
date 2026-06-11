import XCTest
@testable import Tessera

final class ClozeTests: XCTestCase {
    func testMaskReplacesClozeWithBlank() {
        XCTAssertEqual(
            Cloze.mask("RFID は {{c1::非接触}} 型の技術である"),
            "RFID は 【____】 型の技術である"
        )
    }

    func testMaskReplacesMultipleClozes() {
        XCTAssertEqual(
            Cloze.mask("{{c1::A}} と {{c2::B}} を比較する"),
            "【____】 と 【____】 を比較する"
        )
    }

    func testMaskKeepsPlainTextUnchanged() {
        XCTAssertEqual(Cloze.mask("DIとは何か?"), "DIとは何か?")
    }

    func testMaskHandlesEmptyCloze() {
        XCTAssertEqual(Cloze.mask("空欄 {{c1::}} のケース"), "空欄 【____】 のケース")
    }

    func testRevealShowsAnswerInBrackets() {
        XCTAssertEqual(
            Cloze.reveal("RFID は {{c1::非接触}} 型の技術である"),
            "RFID は 【非接触】 型の技術である"
        )
    }

    func testContains() {
        XCTAssertTrue(Cloze.contains("{{c1::答え}} を含む"))
        XCTAssertFalse(Cloze.contains("マーカーなし"))
    }
}
