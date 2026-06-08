import SwiftUI

struct NoteDetailView: View {
    @EnvironmentObject private var session: AuthSessionStore
    let note: NoteSeed

    @State private var candidates: [AiCardCandidate] = []
    @State private var generationStatus: AiGenerationStatus?
    @State private var isLoadingCandidates = false
    @State private var isGenerating = false
    @State private var errorMessage: String?

    var body: some View {
        List {
            Section("メモ") {
                Text(note.body)
                    .font(.body)
                    .textSelection(.enabled)

                if let learningGoal = note.learningGoal, !learningGoal.isEmpty {
                    LabeledContent("目的", value: learningGoal)
                }
            }

            Section {
                Button {
                    Task {
                        await generate()
                    }
                } label: {
                    HStack {
                        if isGenerating {
                            ProgressView()
                        } else {
                            Image(systemName: "sparkles")
                        }
                        Text(isGenerating ? "生成中" : "AI候補を生成")
                    }
                }
                .disabled(isGenerating)

                if let generationStatus {
                    GenerationStatusRow(status: generationStatus)
                }
            }

            if let errorMessage {
                Section {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                }
            }

            Section("候補") {
                if isLoadingCandidates {
                    ProgressView()
                } else if candidates.isEmpty {
                    ContentUnavailableView(
                        "候補がありません",
                        systemImage: "sparkles",
                        description: Text("AI候補を生成するとここに表示されます。")
                    )
                } else {
                    ForEach(candidates) { candidate in
                        CandidateRow(candidate: candidate)
                    }
                }
            }
        }
        .navigationTitle("メモ詳細")
        .toolbar {
            Button {
                Task {
                    await loadCandidates()
                    await loadStatus()
                }
            } label: {
                Image(systemName: "arrow.clockwise")
            }
            .disabled(isLoadingCandidates || isGenerating)
        }
        .refreshable {
            await loadCandidates()
            await loadStatus()
        }
        .task {
            await loadCandidates()
            await loadStatus()
        }
    }

    private func loadCandidates() async {
        isLoadingCandidates = true
        errorMessage = nil

        do {
            candidates = try await session.makeAiCandidateService().list(noteSeedId: note.id)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoadingCandidates = false
    }

    private func loadStatus() async {
        do {
            generationStatus = try await session.makeAiCandidateService().status(noteSeedId: note.id)
        } catch {
            if errorMessage == nil {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func generate() async {
        isGenerating = true
        errorMessage = nil

        do {
            generationStatus = try await session.makeAiCandidateService().generate(noteSeedId: note.id)
            await loadCandidates()
        } catch {
            errorMessage = error.localizedDescription
        }

        isGenerating = false
    }
}

private struct GenerationStatusRow: View {
    let status: AiGenerationStatus

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label(statusLabel, systemImage: statusIcon)
                .font(.subheadline)

            if let count = status.candidatesCount {
                Text("候補数: \(count)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if let errorReason = status.errorReason, !errorReason.isEmpty {
                Text(errorReason)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
        }
    }

    private var statusLabel: String {
        switch status.status {
        case "queued":
            return "生成待ち"
        case "processing":
            return "生成中"
        case "success":
            return "生成完了"
        case "failed":
            return "生成失敗"
        case "idle":
            return "未生成"
        default:
            return status.status
        }
    }

    private var statusIcon: String {
        switch status.status {
        case "queued", "processing":
            return "hourglass"
        case "success":
            return "checkmark.circle"
        case "failed":
            return "exclamationmark.triangle"
        default:
            return "circle"
        }
    }
}

private struct CandidateRow: View {
    let candidate: AiCardCandidate

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(candidate.question)
                .font(.headline)
                .lineLimit(3)

            Text(candidate.answer)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(4)

            HStack(spacing: 8) {
                if let cardType = candidate.cardType {
                    Label(cardType, systemImage: "rectangle.on.rectangle")
                }

                if let status = candidate.status {
                    Label(status, systemImage: "circle.fill")
                }

                if !candidate.qualityWarnings.isEmpty {
                    Label("\(candidate.qualityWarnings.count)", systemImage: "exclamationmark.triangle")
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 6)
    }
}
