import SwiftUI
import SwiftData

struct NoteListView: View {
    @Query(sort: \LocalNoteSeed.createdAt, order: .reverse) private var notes: [LocalNoteSeed]
    @Query private var candidates: [LocalAiCardCandidate]
    @State private var isCreatePresented = false

    var body: some View {
        NavigationStack {
            List {
                if notes.isEmpty {
                    ContentUnavailableView(
                        "メモがありません",
                        systemImage: "note.text",
                        description: Text("右上の追加ボタンから学習メモを端末内に保存できます。")
                    )
                } else {
                    ForEach(notes) { note in
                        NavigationLink {
                            NoteDetailView(note: note)
                        } label: {
                            VStack(alignment: .leading, spacing: 8) {
                                Text(note.body)
                                    .font(.headline)
                                    .lineLimit(3)

                                HStack(spacing: 10) {
                                    if let learningGoal = note.learningGoal, !learningGoal.isEmpty {
                                        Label(learningGoal, systemImage: "target")
                                            .lineLimit(1)
                                    }

                                    Label("\(pendingCandidateCount(for: note))", systemImage: "sparkles")
                                }
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            }
                            .padding(.vertical, 6)
                        }
                    }
                }
            }
            .navigationTitle("メモ")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        isCreatePresented = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $isCreatePresented) {
                NavigationStack {
                    NoteCreateView { _ in
                        isCreatePresented = false
                    }
                }
            }
        }
    }

    private func pendingCandidateCount(for note: LocalNoteSeed) -> Int {
        candidates.filter { $0.noteSeedId == note.id && $0.status == "pending" }.count
    }
}
