import Foundation
import SwiftData

/// デッキの親子関係に関する純粋ヘルパー。Decks / Review など複数フィーチャーで共有する。

/// カード作成・候補採用で共有する「保存先デッキの確保」ヘルパー。
/// 既存デッキがあれば先頭を選択候補として返し、無ければ「標準デッキ」を作成して挿入する。
/// CardCreateView / CandidateAdoptionView の重複実装を一本化するために置く。
@MainActor
func ensureDefaultDeck(in decks: [LocalDeck], context: ModelContext, currentSelection: UUID?) -> UUID {
    if let firstDeck = decks.first {
        return currentSelection ?? firstDeck.id
    }

    // 既存最大値+1 で並び順を採番（件数=0 のためここでは 0 になる）。
    let order = (decks.map(\.displayOrder).max() ?? -1) + 1
    let deck = LocalDeck(name: String(localized: "標準デッキ"), displayOrder: order)
    context.insert(deck)
    return deck.id
}

/// 指定デッキとその全子孫の id 集合を返す（自分自身を含む）。
func deckDescendantIDs(of id: UUID, in decks: [LocalDeck]) -> Set<UUID> {
    var ids: Set<UUID> = [id]
    var frontier = [id]
    while let current = frontier.popLast() {
        for deck in decks where deck.parentDeckId == current {
            if ids.insert(deck.id).inserted {
                frontier.append(deck.id)
            }
        }
    }
    return ids
}

/// 親デッキ選択や絞り込み用の、ツリー順に並べたインデント付きデッキ。
struct IndentedDeck: Identifiable {
    let deck: LocalDeck
    let depth: Int
    var id: UUID { deck.id }
    /// 全角スペースで階層分インデントした表示名。
    var indentedName: String {
        String(repeating: "　", count: depth) + deck.name
    }
}

/// decks をツリー順（兄弟内は displayOrder）に並べたインデント付き候補を返す。
/// excluding に渡した id は、その配下（子孫）ごと候補から除外する（循環防止に使う）。
func indentedDecks(_ decks: [LocalDeck], excluding excludedId: UUID? = nil) -> [IndentedDeck] {
    func build(parent: UUID?, depth: Int) -> [IndentedDeck] {
        decks
            .filter { $0.parentDeckId == parent && $0.id != excludedId }
            .sorted { $0.displayOrder < $1.displayOrder }
            .flatMap { deck in
                [IndentedDeck(deck: deck, depth: depth)] + build(parent: deck.id, depth: depth + 1)
            }
    }
    return build(parent: nil, depth: 0)
}
