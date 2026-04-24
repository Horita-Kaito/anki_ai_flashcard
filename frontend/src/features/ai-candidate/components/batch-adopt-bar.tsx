"use client";

import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { useBatchAdoptCandidates } from "../api/ai-candidate-queries";
import { useDeckList } from "@/entities/deck/api/deck-queries";
import { buildHierarchicalOptions } from "@/features/deck/lib/deck-tree";
import { Button } from "@/shared/ui/button";

interface BatchAdoptBarProps {
  candidateIds: number[];
}

/**
 * 候補一括採用バー。選択された採用先デッキで一度にカード化する。
 */
export function BatchAdoptBar({ candidateIds }: BatchAdoptBarProps) {
  const { data: decks } = useDeckList();
  const deckOptions = buildHierarchicalOptions(decks ?? []);
  const batchMutation = useBatchAdoptCandidates();
  const [deckId, setDeckId] = useState<number | "">("");

  async function handleBatchAdopt() {
    if (deckId === "") {
      toast.error("採用先のデッキを選択してください");
      return;
    }
    if (
      !confirm(
        `${candidateIds.length} 件の候補をまとめて採用します。よろしいですか?`
      )
    ) {
      return;
    }
    try {
      const result = await batchMutation.mutateAsync({
        deck_id: Number(deckId),
        candidate_ids: candidateIds,
      });
      toast.success(`${result.adopted_count} 件のカードを採用しました`);
    } catch {
      toast.error("一括採用に失敗しました");
    }
  }

  if (candidateIds.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <select
        value={deckId}
        onChange={(e) => setDeckId(e.target.value === "" ? "" : Number(e.target.value))}
        className="border rounded-md px-2 py-1.5 text-xs md:text-sm min-h-9 bg-background"
        aria-label="採用先のデッキ"
      >
        <option value="">デッキ選択</option>
        {deckOptions.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {"— ".repeat(opt.depth)}
            {opt.name}
          </option>
        ))}
      </select>
      <Button
        type="button"
        size="sm"
        className="min-h-9"
        onClick={handleBatchAdopt}
        disabled={batchMutation.isPending || deckId === ""}
      >
        <CheckCheck className="size-4" aria-hidden />
        全て採用
      </Button>
    </div>
  );
}
