import Foundation

@MainActor
final class APIClient {
    private let baseURL: URL
    private let tokenProvider: () -> String?
    private let session: URLSession

    init(
        baseURL: URL,
        tokenProvider: @escaping () -> String?,
        session: URLSession = .shared
    ) {
        self.baseURL = baseURL
        self.tokenProvider = tokenProvider
        self.session = session
    }

    func request<Response: Decodable>(
        _ path: String,
        method: HTTPMethod = .get,
        body: Encodable? = nil
    ) async throws -> Response {
        var request = URLRequest(url: url(for: path))
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let token = tokenProvider() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder.api.encode(AnyEncodable(body))
        }

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200..<300).contains(httpResponse.statusCode) else {
            let errorResponse = try? JSONDecoder.api.decode(APIErrorResponse.self, from: data)
            throw APIError.httpStatus(httpResponse.statusCode, errorResponse?.message)
        }

        if Response.self == EmptyResponse.self {
            return EmptyResponse() as! Response
        }

        do {
            return try JSONDecoder.api.decode(Response.self, from: data)
        } catch {
            throw APIError.decoding(error)
        }
    }

    private func url(for path: String) -> URL {
        let normalizedPath = path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        return baseURL.appending(path: normalizedPath)
    }
}

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case delete = "DELETE"
}

struct EmptyResponse: Decodable {}

extension JSONDecoder {
    static var api: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }
}

extension JSONEncoder {
    static var api: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }
}
