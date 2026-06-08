import SwiftUI

struct NoteListView: View {
    @EnvironmentObject private var session: AuthSessionStore
    @State private var notes: [NoteSeed] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var isCreatePresented = false

    var body: some View {
        NavigationStack {
            List {
                if isLoading {
                    ProgressView()
                } else if let errorMessage {
                    ContentUnavailableView(
                        "読み込みに失敗しました",
                        systemImage: "exclamationmark.triangle",
                        description: Text(errorMessage)
                    )
                } else if notes.isEmpty {
                    ContentUnavailableView(
                        "メモがありません",
                        systemImage: "note.text",
                        description: Text("右上の追加ボタンから学習メモを保存できます。")
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

                                    if let count = note.candidatesPendingCount {
                                        Label("\(count)", systemImage: "sparkles")
                                    }
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
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        Task {
                            await load()
                        }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .disabled(isLoading)
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        isCreatePresented = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .refreshable {
                await load()
            }
            .sheet(isPresented: $isCreatePresented) {
                NavigationStack {
                    NoteCreateView { _ in
                        isCreatePresented = false
                        Task {
                            await load()
                        }
                    }
                }
            }
            .task {
                await load()
            }
        }
    }

    private func load() async {
        isLoading = true
        errorMessage = nil

        do {
            notes = try await session.makeNoteSeedService().list()
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}
