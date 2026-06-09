import UIKit

/// 触覚フィードバックの集約。画面側は端末 API を直接触らず、意味単位でこのヘルパを呼ぶ。
/// フィードバックジェネレータはメインアクター上で扱うため `@MainActor` に閉じる。
@MainActor
enum Haptics {
    /// 軽いタップ（答えを見る、画面遷移を伴わない確定など）。
    static func tap() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    /// 選択の切り替え（評価ボタンの選択など）。
    static func selection() {
        UISelectionFeedbackGenerator().selectionChanged()
    }

    /// 成功・完了（保存成功、セッション完了など）。
    static func success() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    /// 警告（破壊的操作の確認、注意喚起など）。
    static func warning() {
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
    }

    /// 失敗（保存失敗、生成エラーなど）。
    static func error() {
        UINotificationFeedbackGenerator().notificationOccurred(.error)
    }
}
