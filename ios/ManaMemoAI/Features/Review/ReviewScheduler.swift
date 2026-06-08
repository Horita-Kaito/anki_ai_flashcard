import Foundation

enum ReviewRating: String, CaseIterable, Identifiable {
    case again
    case hard
    case good
    case easy

    var id: String { rawValue }

    var title: String {
        switch self {
        case .again:
            return "もう一度"
        case .hard:
            return "難しい"
        case .good:
            return "普通"
        case .easy:
            return "簡単"
        }
    }

    var systemImage: String {
        switch self {
        case .again:
            return "arrow.counterclockwise"
        case .hard:
            return "tortoise"
        case .good:
            return "checkmark.circle"
        case .easy:
            return "bolt"
        }
    }
}

enum ReviewScheduler {
    static func apply(_ rating: ReviewRating, to card: LocalCard, now: Date = .now) {
        switch rating {
        case .again:
            card.repetitions = 0
            card.intervalDays = 0
            card.lapseCount += 1
            card.dueAt = Calendar.current.date(byAdding: .minute, value: 10, to: now) ?? now
        case .hard:
            card.repetitions += 1
            card.intervalDays = max(1, card.intervalDays)
            card.dueAt = Calendar.current.date(byAdding: .day, value: 1, to: now) ?? now
        case .good:
            card.repetitions += 1
            card.intervalDays = nextInterval(for: card.intervalDays, multiplier: 2)
            card.dueAt = Calendar.current.date(byAdding: .day, value: card.intervalDays, to: now) ?? now
        case .easy:
            card.repetitions += 1
            card.intervalDays = nextInterval(for: card.intervalDays, multiplier: 3)
            card.dueAt = Calendar.current.date(byAdding: .day, value: card.intervalDays, to: now) ?? now
        }

        card.updatedAt = now
    }

    private static func nextInterval(for current: Int, multiplier: Int) -> Int {
        guard current > 0 else {
            return multiplier == 3 ? 4 : 1
        }

        return min(current * multiplier, 365)
    }
}
