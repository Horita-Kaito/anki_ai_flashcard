import SwiftUI
import UIKit

/// アプリ全体の余白スケール。8pt グリッドを基準にし、各画面でのマジックナンバーを排除する。
enum AppSpacing {
    /// 4pt
    static let xs: CGFloat = 4
    /// 8pt
    static let sm: CGFloat = 8
    /// 12pt
    static let md: CGFloat = 12
    /// 16pt
    static let lg: CGFloat = 16
    /// 24pt
    static let xl: CGFloat = 24
    /// 32pt
    static let xxl: CGFloat = 32
}

/// 角丸スケール。カード・ボタンなどコンテナの一貫性を保つ。
enum AppRadius {
    static let small: CGFloat = 8
    static let medium: CGFloat = 12
    static let large: CGFloat = 16
}

/// セマンティックカラー。システムカラーを「意味」単位でまとめ、各画面が `.red` などを直接指定しないようにする。
/// システムカラーをベースにしているため、ダークモードへ自動追従する。
enum AppColor {
    /// 主要アクション・ブランド基調色。ここを差し替えると全画面のアクセントが一括で変わる。
    static let accent = Color.brandPrimary
    /// 本文テキスト。
    static let primaryText = Color.primary
    /// 補助テキスト・メタ情報。
    static let secondaryText = Color.secondary
    /// 成功・完了。
    static let success = Color.green
    /// 警告・注意。
    static let warning = Color.orange
    /// エラー・破壊的操作。
    static let danger = Color.red
    /// 情報・補足。
    static let info = Color.blue
}

extension Color {
    /// ブランド基調色（インディゴ）。やさしく信頼できる学習ツールを意図し、
    /// iOS標準青と差別化する。ライト/ダークで明度を切り替える。
    static let brandPrimary = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.545, green: 0.518, blue: 0.969, alpha: 1) // #8B84F7
            : UIColor(red: 0.310, green: 0.275, blue: 0.898, alpha: 1) // #4F46E5
    })
}
