import Foundation

struct LocalLLMModelFileLocator {
    enum ValidationResult: Equatable {
        case missing
        case valid(URL, byteCount: Int64)
        case invalid(URL, reason: String, byteCount: Int64)
    }

    private let fileManager: FileManager

    init(fileManager: FileManager = .default) {
        self.fileManager = fileManager
    }

    func localURL(for model: LocalLLMModelSpec) -> URL {
        modelsDirectory.appending(path: model.fileName)
    }

    func downloadedURL(for model: LocalLLMModelSpec) -> URL? {
        switch validationResult(for: model) {
        case .valid(let fileURL, _):
            return fileURL
        case .missing, .invalid:
            return nil
        }
    }

    func validationResult(for model: LocalLLMModelSpec) -> ValidationResult {
        let fileURL = localURL(for: model)
        guard fileManager.fileExists(atPath: fileURL.path) else {
            return .missing
        }

        let byteCount = fileSize(at: fileURL)
        guard byteCount >= minimumExpectedBytes(for: model) else {
            return .invalid(fileURL, reason: "モデルファイルの容量が不足しています", byteCount: byteCount)
        }

        guard hasGGUFMagicHeader(at: fileURL) else {
            return .invalid(fileURL, reason: "GGUFファイルとして認識できません", byteCount: byteCount)
        }

        return .valid(fileURL, byteCount: byteCount)
    }

    var modelsDirectory: URL {
        let baseURL = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return baseURL.appending(path: "Models", directoryHint: .isDirectory)
    }

    private func minimumExpectedBytes(for model: LocalLLMModelSpec) -> Int64 {
        Int64(model.approximateSizeGB * 1024 * 1024 * 1024 * 0.7)
    }

    private func fileSize(at fileURL: URL) -> Int64 {
        let attributes = try? fileManager.attributesOfItem(atPath: fileURL.path)
        return attributes?[.size] as? Int64 ?? 0
    }

    private func hasGGUFMagicHeader(at fileURL: URL) -> Bool {
        guard let fileHandle = try? FileHandle(forReadingFrom: fileURL) else {
            return false
        }

        defer {
            try? fileHandle.close()
        }

        let data = try? fileHandle.read(upToCount: 4)
        return data == Data([0x47, 0x47, 0x55, 0x46])
    }
}
