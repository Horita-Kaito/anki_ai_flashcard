import SwiftUI

/// 名前付きタイポグラフィスタイル。`.font(.title3.weight(.semibold))` のような直書きを画面から排除する。
/// Dynamic Type に追従するよう、固定 pt ではなくテキストスタイルを基準にする。
extension Text {
    /// カード本文や主要コンテンツの見出し。
    func appTitle() -> Text {
        font(.title3.weight(.semibold))
    }

    /// 行・セクションの見出し。
    func appHeadline() -> Text {
        font(.headline)
    }

    /// 標準本文。
    func appBody() -> Text {
        font(.body)
    }

    /// 補足説明。
    func appFootnote() -> Text {
        font(.footnote)
    }
}

extension View {
    /// ラベルの上などに置く小さな見出し（例: 復習カードの「表」「裏」）。
    func eyebrowStyle() -> some View {
        font(.caption.weight(.semibold))
            .foregroundStyle(AppColor.secondaryText)
            .textCase(.uppercase)
            .kerning(0.5)
    }

    /// メタ情報（日時・件数など）の標準スタイル。
    func metadataStyle() -> some View {
        font(.caption)
            .foregroundStyle(AppColor.secondaryText)
    }
}
