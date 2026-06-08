import Foundation
import Combine

@MainActor
final class LocalLLMModelStore: ObservableObject {
    enum State: Equatable {
        case missing
        case downloaded(URL)
        case downloading(DownloadProgress)
        case failed(String)
    }

    struct DownloadProgress: Equatable {
        let fractionCompleted: Double
        let completedBytes: Int64
        let totalBytes: Int64

        var percentage: Int {
            Int((fractionCompleted * 100).rounded())
        }
    }

    @Published private(set) var state: State = .missing

    private let fileManager: FileManager
    private let fileLocator: LocalLLMModelFileLocator
    private var downloadTask: URLSessionDownloadTask?
    private var progressTask: Task<Void, Never>?

    init(fileManager: FileManager = .default) {
        self.fileManager = fileManager
        fileLocator = LocalLLMModelFileLocator(fileManager: fileManager)
    }

    func refresh(for model: LocalLLMModelSpec) {
        let fileURL = localURL(for: model)
        state = fileManager.fileExists(atPath: fileURL.path) ? .downloaded(fileURL) : .missing
    }

    func download(_ model: LocalLLMModelSpec) {
        if case .downloading = state {
            return
        }

        startDownload(model)
    }

    func cancelDownload(for model: LocalLLMModelSpec) {
        downloadTask?.cancel()
        downloadTask = nil
        progressTask?.cancel()
        progressTask = nil
        refresh(for: model)
    }

    func delete(_ model: LocalLLMModelSpec) {
        cancelDownload(for: model)

        do {
            let fileURL = localURL(for: model)
            if fileManager.fileExists(atPath: fileURL.path) {
                try fileManager.removeItem(at: fileURL)
            }
            state = .missing
        } catch {
            state = .failed(error.localizedDescription)
        }
    }

    func localURL(for model: LocalLLMModelSpec) -> URL {
        fileLocator.localURL(for: model)
    }

    private func startDownload(_ model: LocalLLMModelSpec) {
        guard let downloadURL = model.downloadURL else {
            state = .failed("ダウンロードURLが未設定です")
            return
        }

        let initialProgress = DownloadProgress(fractionCompleted: 0, completedBytes: 0, totalBytes: -1)
        state = .downloading(initialProgress)

        let task = URLSession.shared.downloadTask(with: downloadURL) { [weak self] temporaryURL, _, error in
            Task { @MainActor [weak self] in
                guard let self else {
                    return
                }

                self.progressTask?.cancel()
                self.progressTask = nil
                self.downloadTask = nil

                if let error = error as? URLError, error.code == .cancelled {
                    self.refresh(for: model)
                    return
                }

                if let error {
                    self.state = .failed(error.localizedDescription)
                    return
                }

                guard let temporaryURL else {
                    self.state = .failed("ダウンロードしたファイルを保存できませんでした")
                    return
                }

                self.finishDownload(from: temporaryURL, model: model)
            }
        }

        downloadTask = task
        progressTask = Task { [weak self, weak task] in
            do {
                while !Task.isCancelled {
                    guard let task else {
                        break
                    }

                    let progress = task.progress
                    let snapshot = DownloadProgress(
                        fractionCompleted: progress.fractionCompleted.isFinite ? progress.fractionCompleted : 0,
                        completedBytes: progress.completedUnitCount,
                        totalBytes: progress.totalUnitCount
                    )

                    await MainActor.run { [weak self] in
                        self?.state = .downloading(snapshot)
                    }

                    try await Task.sleep(for: .milliseconds(300))
                }
            } catch is CancellationError {
                return
            } catch {
                await MainActor.run { [weak self] in
                    self?.state = .failed(error.localizedDescription)
                }
            }
        }
        task.resume()
    }

    private func finishDownload(from temporaryURL: URL, model: LocalLLMModelSpec) {
        do {
            try fileManager.createDirectory(
                at: fileLocator.modelsDirectory,
                withIntermediateDirectories: true
            )

            let destinationURL = localURL(for: model)
            if fileManager.fileExists(atPath: destinationURL.path) {
                try fileManager.removeItem(at: destinationURL)
            }
            try fileManager.moveItem(at: temporaryURL, to: destinationURL)
            state = .downloaded(destinationURL)
        } catch {
            state = .failed(error.localizedDescription)
        }
    }
}
