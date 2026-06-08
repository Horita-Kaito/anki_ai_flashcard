import Foundation

struct LocalCandidateDraft: Equatable {
    let question: String
    let answer: String
    let focusType: String
    let rationale: String
}

enum LocalCandidateGenerator {
    static func generate(from note: LocalNoteSeed) -> [LocalCandidateDraft] {
        let body = note.body.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !body.isEmpty else {
            return []
        }

        let learningGoal = note.learningGoal?.trimmingCharacters(in: .whitespacesAndNewlines)
        let goalSuffix = learningGoal.map { "（目的: \($0)）" } ?? ""
        let core = body.count > 120 ? String(body.prefix(120)) + "..." : body

        return [
            LocalCandidateDraft(
                question: "このメモの中心概念は何か？",
                answer: core,
                focusType: "definition",
                rationale: "メモ全体から最重要の知識点を確認するため。"
            ),
            LocalCandidateDraft(
                question: "この内容を自分の言葉で説明するとどうなるか？\(goalSuffix)",
                answer: body,
                focusType: "explanation",
                rationale: "理解を再現できるかを確認するため。"
            )
        ]
    }
}
