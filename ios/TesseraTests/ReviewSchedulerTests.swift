import XCTest
@testable import Tessera

final class ReviewSchedulerTests: XCTestCase {
    func testAgainResetsProgressAndSchedulesTenMinutesLater() {
        let now = fixedDate()
        let card = makeCard(
            repetitions: 4,
            intervalDays: 12,
            lapseCount: 1,
            dueAt: now
        )

        ReviewScheduler.apply(.again, to: card, now: now)

        XCTAssertEqual(card.repetitions, 0)
        XCTAssertEqual(card.intervalDays, 0)
        XCTAssertEqual(card.lapseCount, 2)
        XCTAssertDate(card.dueAt, equals: adding(.minute, value: 10, to: now))
        XCTAssertDate(card.updatedAt, equals: now)
    }

    func testHardKeepsAtLeastOneDayInterval() {
        let now = fixedDate()
        let card = makeCard(repetitions: 0, intervalDays: 0, dueAt: now)

        ReviewScheduler.apply(.hard, to: card, now: now)

        XCTAssertEqual(card.repetitions, 1)
        XCTAssertEqual(card.intervalDays, 1)
        XCTAssertDate(card.dueAt, equals: adding(.day, value: 1, to: now))
        XCTAssertDate(card.updatedAt, equals: now)
    }

    func testGoodDoublesExistingInterval() {
        let now = fixedDate()
        let card = makeCard(repetitions: 2, intervalDays: 5, dueAt: now)

        ReviewScheduler.apply(.good, to: card, now: now)

        XCTAssertEqual(card.repetitions, 3)
        XCTAssertEqual(card.intervalDays, 10)
        XCTAssertDate(card.dueAt, equals: adding(.day, value: 10, to: now))
        XCTAssertDate(card.updatedAt, equals: now)
    }

    func testEasyStartsAtFourDaysAndCapsAtOneYear() {
        let now = fixedDate()
        let newCard = makeCard(repetitions: 0, intervalDays: 0, dueAt: now)
        let matureCard = makeCard(repetitions: 8, intervalDays: 200, dueAt: now)

        ReviewScheduler.apply(.easy, to: newCard, now: now)
        ReviewScheduler.apply(.easy, to: matureCard, now: now)

        XCTAssertEqual(newCard.repetitions, 1)
        XCTAssertEqual(newCard.intervalDays, 4)
        XCTAssertDate(newCard.dueAt, equals: adding(.day, value: 4, to: now))

        XCTAssertEqual(matureCard.repetitions, 9)
        XCTAssertEqual(matureCard.intervalDays, 365)
        XCTAssertDate(matureCard.dueAt, equals: adding(.day, value: 365, to: now))
    }

    private func makeCard(
        repetitions: Int,
        intervalDays: Int,
        lapseCount: Int = 0,
        dueAt: Date
    ) -> LocalCard {
        LocalCard(
            deckId: UUID(),
            question: "質問",
            answer: "答え",
            dueAt: dueAt,
            repetitions: repetitions,
            intervalDays: intervalDays,
            lapseCount: lapseCount,
            createdAt: dueAt,
            updatedAt: dueAt
        )
    }

    private func fixedDate() -> Date {
        DateComponents(
            calendar: .current,
            year: 2026,
            month: 1,
            day: 15,
            hour: 12,
            minute: 0,
            second: 0
        ).date!
    }

    private func adding(_ component: Calendar.Component, value: Int, to date: Date) -> Date {
        Calendar.current.date(byAdding: component, value: value, to: date)!
    }

    private func XCTAssertDate(
        _ actual: Date,
        equals expected: Date,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        XCTAssertEqual(actual.timeIntervalSince1970, expected.timeIntervalSince1970, accuracy: 0.001, file: file, line: line)
    }
}
