import Foundation
import Combine

@MainActor
final class LocalLLMModelStore: NSObject, ObservableObject {
    /// バックグラウンドセッションはプロセス内で一意でなければならないため、
    /// ストアはシングルトンとして共有する。
    static let shared = LocalLLMModelStore()

    enum State: Equatable {
        case missing
        case downloaded(URL, byteCount: Int64)
        case invalid(URL, reason: String, byteCount: Int64)
        case downloading(DownloadProgress)
        case failed(String)
    }

    struct DownloadProgress: Equatable, Sendable {
        let fractionCompleted: Double
        let completedBytes: Int64
        let totalBytes: Int64

        var percentage: Int {
            Int((fractionCompleted * 100).rounded())
        }
    }

    @Published private(set) var state: State = .missing

    /// アプリがバックグラウンドDL完了で再起動された際に、システムへ完了を返すためのハンドラ。
    var backgroundCompletionHandler: (() -> Void)?

    private let fileManager: FileManager
    private let fileLocator: LocalLLMModelFileLocator
    private let backgroundSessionIdentifier = "com.tessera.modeldownload"
    private var activeTask: URLSessionDownloadTask?
    private var resumeDataByModelId: [String: Data] = [:]

    private lazy var session: URLSession = {
        let configuration = URLSessionConfiguration.background(withIdentifier: backgroundSessionIdentifier)
        configuration.sessionSendsLaunchEvents = true
        configuration.isDiscretionary = false
        configuration.allowsCellularAccess = true
        return URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
    }()

    init(fileManager: FileManager = .default) {
        self.fileManager = fileManager
        fileLocator = LocalLLMModelFileLocator(fileManager: fileManager)
        super.init()
    }

    func refresh(for model: LocalLLMModelSpec) {
        switch fileLocator.validationResult(for: model) {
        case .missing:
            state = .missing
        case .valid(let fileURL, let byteCount):
            state = .downloaded(fileURL, byteCount: byteCount)
        case .invalid(let fileURL, let reason, let byteCount):
            state = .invalid(fileURL, reason: reason, byteCount: byteCount)
        }
    }

    func download(_ model: LocalLLMModelSpec) {
        if case .downloading = state {
            return
        }

        guard let downloadURL = model.downloadURL else {
            state = .failed("ダウンロードURLが未設定です")
            return
        }

        let task: URLSessionDownloadTask
        if let resumeData = resumeDataByModelId[model.id] {
            task = session.downloadTask(withResumeData: resumeData)
        } else {
            task = session.downloadTask(with: downloadURL)
        }

        task.taskDescription = model.id
        resumeDataByModelId[model.id] = nil
        activeTask = task

        state = .downloading(DownloadProgress(fractionCompleted: 0, completedBytes: 0, totalBytes: -1))
        task.resume()
    }

    func cancelDownload(for model: LocalLLMModelSpec) {
        guard let task = activeTask else {
            refresh(for: model)
            return
        }

        // 再開可能なように resumeData を退避してからキャンセルする。
        task.cancel { [weak self] resumeData in
            guard let resumeData else {
                return
            }

            Task { @MainActor in
                self?.resumeDataByModelId[model.id] = resumeData
            }
        }

        activeTask = nil
        refresh(for: model)
    }

    func delete(_ model: LocalLLMModelSpec) {
        cancelDownload(for: model)
        resumeDataByModelId[model.id] = nil

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

    /// アプリ再起動時にバックグラウンドセッションへ再接続し、完了ハンドラを保持する。
    func handleBackgroundSessionEvents(completionHandler: @escaping () -> Void) {
        backgroundCompletionHandler = completionHandler
        _ = session
    }

    /// ダウンロード済みの一時ファイルを正規の保存先へ移動する（delegate コールバック内で同期実行）。
    private nonisolated static func persistDownloadedFile(at temporaryURL: URL, modelId: String) throws {
        let locator = LocalLLMModelFileLocator()
        let model = LocalLLMModelCatalog.model(id: modelId)
        let fileManager = FileManager.default

        try fileManager.createDirectory(at: locator.modelsDirectory, withIntermediateDirectories: true)

        let destinationURL = locator.localURL(for: model)
        if fileManager.fileExists(atPath: destinationURL.path) {
            try fileManager.removeItem(at: destinationURL)
        }
        try fileManager.moveItem(at: temporaryURL, to: destinationURL)
    }
}

extension LocalLLMModelStore: URLSessionDownloadDelegate {
    nonisolated func urlSession(
        _ session: URLSession,
        downloadTask: URLSessionDownloadTask,
        didWriteData bytesWritten: Int64,
        totalBytesWritten: Int64,
        totalBytesExpectedToWrite: Int64
    ) {
        let fraction = totalBytesExpectedToWrite > 0
            ? Double(totalBytesWritten) / Double(totalBytesExpectedToWrite)
            : 0
        let progress = DownloadProgress(
            fractionCompleted: fraction,
            completedBytes: totalBytesWritten,
            totalBytes: totalBytesExpectedToWrite
        )

        Task { @MainActor [weak self] in
            guard let self else {
                return
            }

            // 完了後に届いた遅延進捗で .downloaded/.invalid を上書きしないようガードする。
            switch self.state {
            case .downloaded, .invalid:
                return
            default:
                self.state = .downloading(progress)
            }
        }
    }

    nonisolated func urlSession(
        _ session: URLSession,
        downloadTask: URLSessionDownloadTask,
        didFinishDownloadingTo location: URL
    ) {
        let modelId = downloadTask.taskDescription
        var persistError: Error?

        // 一時ファイルはコールバックから戻ると削除されるため、ここで同期的に移動する。
        if let modelId {
            do {
                try Self.persistDownloadedFile(at: location, modelId: modelId)
            } catch {
                persistError = error
            }
        }

        Task { @MainActor [weak self] in
            guard let self else {
                return
            }

            self.activeTask = nil

            guard let modelId else {
                self.state = .failed("ダウンロードしたファイルを保存できませんでした")
                return
            }

            if let persistError {
                self.state = .failed(persistError.localizedDescription)
                return
            }

            self.resumeDataByModelId[modelId] = nil
            self.refresh(for: LocalLLMModelCatalog.model(id: modelId))
        }
    }

    nonisolated func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        didCompleteWithError error: Error?
    ) {
        // 成功時は didFinishDownloadingTo で処理済み。ここではエラー・キャンセルのみ扱う。
        guard let error else {
            return
        }

        let modelId = task.taskDescription
        let resumeData = (error as NSError).userInfo[NSURLSessionDownloadTaskResumeData] as? Data
        let isCancelled = (error as? URLError)?.code == .cancelled

        Task { @MainActor [weak self] in
            guard let self else {
                return
            }

            self.activeTask = nil

            if let modelId, let resumeData {
                self.resumeDataByModelId[modelId] = resumeData
            }

            if isCancelled {
                if let modelId {
                    self.refresh(for: LocalLLMModelCatalog.model(id: modelId))
                }
            } else {
                self.state = .failed(error.localizedDescription)
            }
        }
    }

    nonisolated func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
        Task { @MainActor [weak self] in
            guard let self else {
                return
            }

            let handler = self.backgroundCompletionHandler
            self.backgroundCompletionHandler = nil
            handler?()
        }
    }
}
