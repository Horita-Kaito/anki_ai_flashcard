import SwiftUI

/// カード状コンテナの共通装飾。余白・角丸・背景マテリアルを一括で与える。
/// 復習カードや情報ブロックなど、画面をまたいで同じ見た目を保つために使う。
struct CardSurface: ViewModifier {
    var material: Material = .thinMaterial
    var bordered: Bool = false

    func body(content: Content) -> some View {
        content
            .padding(AppSpacing.lg)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(material, in: RoundedRectangle(cornerRadius: AppRadius.medium))
            .overlay {
                if bordered {
                    RoundedRectangle(cornerRadius: AppRadius.medium)
                        .stroke(.quaternary)
                }
            }
    }
}

extension View {
    /// カード状コンテナ装飾を適用する。
    func cardSurface(material: Material = .thinMaterial, bordered: Bool = false) -> some View {
        modifier(CardSurface(material: material, bordered: bordered))
    }
}

/// 画面内インラインの状態メッセージ（情報・成功・警告・エラー）。
/// 各画面で `.red` テキストや orange Label を直書きしていたものを統一する。
struct InlineStatusView: View {
    enum Kind {
        case info, success, warning, error

        var color: Color {
            switch self {
            case .info: AppColor.info
            case .success: AppColor.success
            case .warning: AppColor.warning
            case .error: AppColor.danger
            }
        }

        var systemImage: String {
            switch self {
            case .info: "info.circle"
            case .success: "checkmark.circle"
            case .warning: "exclamationmark.triangle"
            case .error: "xmark.octagon"
            }
        }
    }

    let kind: Kind
    private let text: Text

    /// リテラル文字列向け。String Catalog で自動ローカライズされる。
    init(_ kind: Kind, _ message: LocalizedStringKey) {
        self.kind = kind
        self.text = Text(message)
    }

    /// 既に解決済みの動的文字列（システムエラーや埋め込み済みメッセージ）向け。そのまま表示する。
    init(_ kind: Kind, verbatim message: String) {
        self.kind = kind
        self.text = Text(message)
    }

    var body: some View {
        Label {
            text
                .appFootnote()
                .foregroundStyle(AppColor.primaryText)
        } icon: {
            Image(systemName: kind.systemImage)
                .foregroundStyle(kind.color)
        }
        .accessibilityElement(children: .combine)
    }
}
