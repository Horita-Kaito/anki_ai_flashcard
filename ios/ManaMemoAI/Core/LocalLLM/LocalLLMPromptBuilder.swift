import Foundation

enum LocalLLMPromptBuilder {
    static func buildPrompt(noteBody: String, learningGoal: String?) -> String {
        let goal = learningGoal?.trimmingCharacters(in: .whitespacesAndNewlines)
        let goalLine = goal.map { "\n学習目的: \($0)" } ?? ""

        return """
        あなたは暗記カード作成を補助する日本語の学習アシスタントです。
        次のメモから、復習に使える基本Q&Aカード候補を2〜4件作ってください。

        制約:
        - 出力はJSONのみ。
        - 最初の文字は {、最後の文字は } にする。
        - Markdownや説明文をJSONの外に出さない。
        - cards配列を持つオブジェクトにする。
        - question、answer、focus_type、rationaleを必ず含める。
        - questionとanswerは空文字にしない。
        - answerは短く、復習時に思い出せる粒度にする。
        - AI候補はユーザーが確認してから採用する前提で作る。

        JSON形式:
        {
          "cards": [
            {
              "question": "質問",
              "answer": "答え",
              "focus_type": "definition",
              "rationale": "この候補を作った理由"
            }
          ]
        }

        メモ:\(goalLine)
        \(noteBody)
        """
    }
}
