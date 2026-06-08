import Foundation

struct LocalLLMModelFileLocator {
    private let fileManager: FileManager

    init(fileManager: FileManager = .default) {
        self.fileManager = fileManager
    }

    func localURL(for model: LocalLLMModelSpec) -> URL {
        modelsDirectory.appending(path: model.fileName)
    }

    func downloadedURL(for model: LocalLLMModelSpec) -> URL? {
        let fileURL = localURL(for: model)
        return fileManager.fileExists(atPath: fileURL.path) ? fileURL : nil
    }

    var modelsDirectory: URL {
        let baseURL = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return baseURL.appending(path: "Models", directoryHint: .isDirectory)
    }
}
