import SwiftUI

/// 初回起動時に中心体験（メモ→AI候補→採用→復習）を伝える導入画面。
struct OnboardingView: View {
    let onComplete: () -> Void

    private struct Step: Identifiable {
        let id: Int
        let symbol: String
        let title: LocalizedStringKey
        let detail: LocalizedStringKey
    }

    private let steps: [Step] = [
        Step(id: 0, symbol: "square.and.pencil",
             title: "メモを書く",
             detail: "学習中の気づきや間違えた論点を短く残します。"),
        Step(id: 1, symbol: "sparkles",
             title: "AIが候補を出す",
             detail: "メモからフラッシュカードの候補を自動で作ります。"),
        Step(id: 2, symbol: "checkmark.circle",
             title: "迷わず採用する",
             detail: "候補を確認し、必要なものだけカードにします。"),
        Step(id: 3, symbol: "arrow.triangle.2.circlepath",
             title: "翌日ちゃんと復習に出る",
             detail: "間隔反復で、忘れそうな頃に出題されます。")
    ]

    var body: some View {
        VStack(spacing: AppSpacing.xl) {
            header

            VStack(alignment: .leading, spacing: AppSpacing.lg) {
                ForEach(steps) { step in
                    stepRow(step)
                }
            }

            Spacer()

            Button("始める") {
                Haptics.tap()
                onComplete()
            }
            .buttonStyle(.primaryAction)
        }
        .padding(AppSpacing.xl)
    }

    private var header: some View {
        VStack(spacing: AppSpacing.sm) {
            Image(systemName: "brain.head.profile")
                .font(.system(size: 52))
                .foregroundStyle(AppColor.accent)
                .accessibilityHidden(true)

            Text("まなメモAI")
                .font(.largeTitle.bold())

            Text("メモから問題を作り、復習で覚える。")
                .appBody()
                .foregroundStyle(AppColor.secondaryText)
                .multilineTextAlignment(.center)
        }
        .padding(.top, AppSpacing.xxl)
    }

    private func stepRow(_ step: Step) -> some View {
        HStack(alignment: .top, spacing: AppSpacing.md) {
            Image(systemName: step.symbol)
                .font(.title2)
                .foregroundStyle(AppColor.accent)
                .frame(width: 36)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                Text(step.title)
                    .appHeadline()
                Text(step.detail)
                    .appFootnote()
                    .foregroundStyle(AppColor.secondaryText)
            }
        }
        .accessibilityElement(children: .combine)
    }
}
