import SwiftUI

/// ラベル付きの読み込み表示。裸の `ProgressView()` を置き換え、「何を待っているか」を明示する。
struct LabeledProgressView: View {
    private let title: LocalizedStringKey

    init(_ title: LocalizedStringKey) {
        self.title = title
    }

    var body: some View {
        HStack(spacing: AppSpacing.sm) {
            ProgressView()
            Text(title)
                .appFootnote()
                .foregroundStyle(AppColor.secondaryText)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(Text(title))
    }
}
