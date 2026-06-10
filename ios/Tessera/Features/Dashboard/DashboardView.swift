import SwiftUI
import SwiftData

/// 学習状況をまとめて把握するホーム画面。最優先ペルソナ（資格学習者）の
/// 「今日やること」と「進捗」を1画面で確認できるようにする。
struct DashboardView: View {
    @Query private var cards: [LocalCard]
    @Query private var candidates: [LocalAiCardCandidate]
    @Query private var decks: [LocalDeck]

    /// 復習タブへ切り替える。
    let onStartReview: () -> Void
    /// メモタブ（AI候補の確認）へ切り替える。
    let onOpenCandidates: () -> Void

    private var dueCount: Int {
        cards.filter { $0.dueAt <= .now && !$0.isSuspended }.count
    }

    private var pendingCount: Int {
        candidates.filter { $0.status == "pending" }.count
    }

    private var masteredCount: Int {
        // 間隔が21日以上に伸びたカードを「定着」とみなす（間隔反復の慣例的なしきい値）。
        cards.filter { $0.intervalDays >= 21 }.count
    }

    private var thisWeekAdded: Int {
        let weekAgo = Date.now.addingTimeInterval(-7 * 24 * 60 * 60)
        return cards.filter { $0.createdAt > weekAgo }.count
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    todayReviewCard

                    if pendingCount > 0 {
                        candidatesCard
                    }

                    statsGrid
                }
                .padding()
            }
            .navigationTitle("ホーム")
        }
    }

    private var todayReviewCard: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            Text("今日の復習")
                .eyebrowStyle()

            HStack(alignment: .firstTextBaseline, spacing: AppSpacing.xs) {
                Text("\(dueCount)")
                    .font(.system(size: 44, weight: .bold))
                    .foregroundStyle(AppColor.accent)
                Text("枚")
                    .appBody()
                    .foregroundStyle(AppColor.secondaryText)
            }

            Text(dueCount > 0 ? "復習対象のカードがあります。" : "今日の復習はありません。お疲れさまでした。")
                .appFootnote()
                .foregroundStyle(AppColor.secondaryText)

            Button(dueCount > 0 ? "復習を始める" : "前倒しで復習する") {
                Haptics.tap()
                onStartReview()
            }
            .buttonStyle(.primaryAction)
        }
        .cardSurface()
        .accessibilityElement(children: .contain)
    }

    private var candidatesCard: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            Label("未確認のAI候補", systemImage: "sparkles")
                .font(.headline)
                .foregroundStyle(AppColor.accent)

            Text("\(pendingCount) 件の候補が確認待ちです。")
                .appFootnote()
                .foregroundStyle(AppColor.secondaryText)

            Button("候補を確認する") {
                Haptics.tap()
                onOpenCandidates()
            }
            .buttonStyle(.secondaryAction)
        }
        .cardSurface()
        .accessibilityElement(children: .contain)
    }

    private var statsGrid: some View {
        LazyVGrid(
            columns: [GridItem(.flexible()), GridItem(.flexible())],
            spacing: AppSpacing.md
        ) {
            statTile("総カード", value: cards.count, symbol: "rectangle.on.rectangle")
            statTile("定着", value: masteredCount, symbol: "checkmark.seal")
            statTile("今週追加", value: thisWeekAdded, symbol: "calendar.badge.plus")
            statTile("デッキ", value: decks.count, symbol: "rectangle.stack")
        }
    }

    private func statTile(_ title: LocalizedStringKey, value: Int, symbol: String) -> some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            Label(title, systemImage: symbol)
                .metadataStyle()
            Text("\(value)")
                .font(.title2.bold())
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardSurface(material: .regularMaterial)
        .accessibilityElement(children: .combine)
    }
}
