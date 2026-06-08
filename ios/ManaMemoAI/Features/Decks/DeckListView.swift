import SwiftUI

struct DeckListView: View {
    @EnvironmentObject private var session: AuthSessionStore
    @State private var decks: [Deck] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        List {
            if isLoading {
                ProgressView()
            } else if let errorMessage {
                ContentUnavailableView(
                    "読み込みに失敗しました",
                    systemImage: "exclamationmark.triangle",
                    description: Text(errorMessage)
                )
            } else if decks.isEmpty {
                ContentUnavailableView(
                    "デッキがありません",
                    systemImage: "rectangle.stack"
                )
            } else {
                ForEach(decks) { deck in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(deck.path ?? deck.name)
                            .font(.headline)

                        if let description = deck.description, !description.isEmpty {
                            Text(description)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .lineLimit(2)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .navigationTitle("デッキ")
        .toolbar {
            Button {
                Task {
                    await load()
                }
            } label: {
                Image(systemName: "arrow.clockwise")
            }
            .disabled(isLoading)
        }
        .task {
            await load()
        }
    }

    private func load() async {
        isLoading = true
        errorMessage = nil

        do {
            decks = try await session.makeDeckService().list()
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}
