import SwiftUI
import SwiftData

struct NoteListView: View {
    @Environment(\.modelContext) private var modelContext
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
                    Section {
                        ForEach(notes) { note in
                            NavigationLink {
                                NoteDetailView(note: note)
                            } label: {
                                noteRow(note)
                            }
                        }
                        .onDelete(perform: deleteNotes)
                    } header: {
                        Text("\(notes.count) 件")
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
                    .accessibilityLabel("メモを追加")
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

    @ViewBuilder
    private func noteRow(_ note: LocalNoteSeed) -> some View {
        let pending = pendingCandidateCount(for: note)

        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text(note.body)
                .font(.headline)
                .lineLimit(3)

            HStack(spacing: AppSpacing.md) {
                if let learningGoal = note.learningGoal, !learningGoal.isEmpty {
                    Label(learningGoal, systemImage: "target")
                        .lineLimit(1)
                        .metadataStyle()
                }

                // 未確認のAI候補がある場合のみ、アクセントを付けて目立たせる。
                if pending > 0 {
                    Label("AI候補 \(pending)", systemImage: "sparkles")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(AppColor.accent)
                }
            }
        }
        .padding(.vertical, AppSpacing.xs)
        .accessibilityElement(children: .combine)
    }

    private func pendingCandidateCount(for note: LocalNoteSeed) -> Int {
        candidates.filter { $0.noteSeedId == note.id && $0.status == "pending" }.count
    }

    // メモ削除時は紐づくAI候補も一緒に削除する。採用済みカードは独立データなので残す。
    private func deleteNotes(_ offsets: IndexSet) {
        for offset in offsets {
            let note = notes[offset]
            for candidate in candidates where candidate.noteSeedId == note.id {
                modelContext.deleteTracked(entity: SyncEntity.candidates, clientId: candidate.id, model: candidate)
            }
            modelContext.deleteTracked(entity: SyncEntity.noteSeeds, clientId: note.id, model: note)
        }
    }
}
