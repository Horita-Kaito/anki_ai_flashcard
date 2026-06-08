import Foundation
import Combine

@MainActor
final class LocalLLMModelStore: ObservableObject {
    enum State: Equatable {
        case missing
        case downloaded(URL)
        case downloading
        case failed(String)
    }

    @Published private(set) var state: State = .missing

    private let fileManager: FileManager
    private var downloadTask: Task<Void, Never>?

    init(fileManager: FileManager = .default) {
        self.fileManager = fileManager
    }

    func refresh(for model: LocalLLMModelSpec) {
        let fileURL = localURL(for: model)
        state = fileManager.fileExists(atPath: fileURL.path) ? .downloaded(fileURL) : .missing
    }

    func download(_ model: LocalLLMModelSpec) {
        guard case .downloading = state else {
            startDownload(model)
            return
        }
    }

    func delete(_ model: LocalLLMModelSpec) {
        downloadTask?.cancel()
        downloadTask = nil

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
        modelsDirectory.appending(path: model.fileName)
    }

    private func startDownload(_ model: LocalLLMModelSpec) {
        guard let downloadURL = model.downloadURL else {
            state = .failed("ダウンロードURLが未設定です")
            return
        }

        state = .downloading
        downloadTask = Task { [weak self] in
            do {
                guard let self else {
                    return
                }

                let (temporaryURL, _) = try await URLSession.shared.download(from: downloadURL)
                try self.fileManager.createDirectory(
                    at: self.modelsDirectory,
                    withIntermediateDirectories: true
                )

                let destinationURL = self.localURL(for: model)
                if self.fileManager.fileExists(atPath: destinationURL.path) {
                    try self.fileManager.removeItem(at: destinationURL)
                }
                try self.fileManager.moveItem(at: temporaryURL, to: destinationURL)
                self.state = .downloaded(destinationURL)
            } catch is CancellationError {
                self?.state = .missing
            } catch {
                self?.state = .failed(error.localizedDescription)
            }
        }
    }

    private var modelsDirectory: URL {
        let baseURL = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return baseURL.appending(path: "Models", directoryHint: .isDirectory)
    }
}
