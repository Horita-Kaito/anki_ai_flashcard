import SwiftUI

/// 主要アクション用ボタンスタイル。全幅・塗りつぶし・プレス時の軽い縮小で押下感を出す。
/// `.disabled` 時は環境値 `isEnabled` を見てトーンを落とす。
struct PrimaryActionButtonStyle: ButtonStyle {
    var fullWidth: Bool = true

    func makeBody(configuration: Configuration) -> some View {
        StyledLabel(configuration: configuration, fullWidth: fullWidth)
    }

    private struct StyledLabel: View {
        let configuration: Configuration
        let fullWidth: Bool
        @Environment(\.isEnabled) private var isEnabled

        var body: some View {
            configuration.label
                .font(.headline)
                .frame(maxWidth: fullWidth ? .infinity : nil)
                .padding(.vertical, AppSpacing.md)
                .padding(.horizontal, AppSpacing.lg)
                .foregroundStyle(.white)
                .background(
                    AppColor.accent.opacity(isEnabled ? 1 : 0.4),
                    in: RoundedRectangle(cornerRadius: AppRadius.medium)
                )
                .opacity(configuration.isPressed ? 0.85 : 1)
                .scaleEffect(configuration.isPressed ? 0.98 : 1)
                .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
        }
    }
}

/// 補助アクション用ボタンスタイル。塗りつぶしより控えめな、淡い色面のボタン。
struct SecondaryActionButtonStyle: ButtonStyle {
    var tint: Color = AppColor.accent
    var fullWidth: Bool = true

    func makeBody(configuration: Configuration) -> some View {
        StyledLabel(configuration: configuration, tint: tint, fullWidth: fullWidth)
    }

    private struct StyledLabel: View {
        let configuration: Configuration
        let tint: Color
        let fullWidth: Bool
        @Environment(\.isEnabled) private var isEnabled

        var body: some View {
            configuration.label
                .font(.headline)
                .frame(maxWidth: fullWidth ? .infinity : nil)
                .padding(.vertical, AppSpacing.md)
                .padding(.horizontal, AppSpacing.lg)
                .foregroundStyle(tint.opacity(isEnabled ? 1 : 0.4))
                .background(
                    tint.opacity(isEnabled ? 0.12 : 0.06),
                    in: RoundedRectangle(cornerRadius: AppRadius.medium)
                )
                .opacity(configuration.isPressed ? 0.7 : 1)
                .scaleEffect(configuration.isPressed ? 0.98 : 1)
                .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
        }
    }
}

extension ButtonStyle where Self == PrimaryActionButtonStyle {
    /// 主要アクション。`.buttonStyle(.primaryAction)` で利用する。
    static var primaryAction: PrimaryActionButtonStyle { PrimaryActionButtonStyle() }
}

extension ButtonStyle where Self == SecondaryActionButtonStyle {
    /// 補助アクション。`.buttonStyle(.secondaryAction)` で利用する。
    static var secondaryAction: SecondaryActionButtonStyle { SecondaryActionButtonStyle() }

    /// 色を指定する補助アクション（評価ボタンなど意味色を持たせたい場合）。
    static func secondaryAction(tint: Color) -> SecondaryActionButtonStyle {
        SecondaryActionButtonStyle(tint: tint)
    }
}
