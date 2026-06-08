import Foundation

struct Deck: Decodable, Identifiable, Equatable {
    let id: Int
    let parentId: Int?
    let name: String
    let description: String?
    let defaultDomainTemplateId: Int?
    let displayOrder: Int
    let path: String?
    let hasChildren: Bool?
    let createdAt: Date?
    let updatedAt: Date?
}
