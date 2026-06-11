import Foundation

/// cloze 記法 `{{cN::answer}}` のテキスト処理。
/// backend の `App\Support\Cloze` / frontend の `ClozeText` / CLI の `cloze.ts` と同じ正規表現を使う。
enum Cloze {
    // Regex は Sendable でないため、Swift 6 の strict concurrency では
    // static stored property にできない。computed property で都度生成する。
    private static var pattern: Regex<(Substring, Substring)> {
        /\{\{c\d+::([^}]*)\}\}/
    }

    static func contains(_ text: String) -> Bool {
        text.firstMatch(of: pattern) != nil
    }

    /// 答えを伏せて出題用に整形する。cloze の中身は答えそのものなので、
    /// 復習の表面に出す前に必ず適用する。
    static func mask(_ text: String) -> String {
        text.replacing(pattern) { _ in "【____】" }
    }

    /// 答えを開示して表示する (復習で答えを見た後や、一覧プレビュー用)。
    static func reveal(_ text: String) -> String {
        text.replacing(pattern) { match in "【\(match.output.1)】" }
    }
}
