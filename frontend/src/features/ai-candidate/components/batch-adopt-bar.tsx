"use client";

import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { useBatchAdoptCandidates } from "../api/ai-candidate-queries";
import { useDeckList } from "@/entities/deck/api/deck-queries";
import { buildHierarchicalOptions } from "@/shared/lib/deck-tree";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";

interface BatchAdoptBarProps {
  candidateIds: number[];
}

const MAX_DECK_NAME_LENGTH = 28;

function truncate(s: string): string {
  return s.length > MAX_DECK_NAME_LENGTH
    ? s.slice(0, MAX_DECK_NAME_LENGTH) + "…"
    : s;
}

/**
 * 候補一括採用バー。選択された採用先デッキで一度にカード化する。
 * モバイルでは画面下に固定し、PC ではセクション内インラインで描画する。
 */
export function BatchAdoptBar({ candidateIds }: BatchAdoptBarProps) {
  const { data: decks } = useDeckList();
  const deckOptions = buildHierarchicalOptions(decks ?? []);
  const batchMutation = useBatchAdoptCandidates();
  const [deckId, setDeckId] = useState<number | "">("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  function requestAdopt() {
    if (deckId === "") {
      toast.error("採用先のデッキを選択してください");
      return;
    }
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    setConfirmOpen(false);
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
    <>
      <div
        className="
          fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))]
          border-t bg-background/95 backdrop-blur z-30
          p-3
          md:static md:border-0 md:bg-transparent md:backdrop-blur-0
          md:p-0 md:inset-x-auto md:bottom-auto
        "
      >
        <div className="flex items-center gap-2 max-w-3xl mx-auto md:max-w-none">
          <select
            value={deckId}
            onChange={(e) =>
              setDeckId(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="flex-1 md:flex-none border rounded-md px-2 py-1.5 text-sm md:text-sm min-h-11 md:min-h-9 bg-background min-w-0"
            aria-label="採用先のデッキ"
          >
            <option value="">デッキ選択</option>
            {deckOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {"— ".repeat(opt.depth)}
                {truncate(opt.name)}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            className="min-h-11 md:min-h-9"
            onClick={requestAdopt}
            disabled={batchMutation.isPending || deckId === ""}
          >
            <CheckCheck className="size-4" aria-hidden />
            <span className="hidden sm:inline">全て採用</span>
            <span className="sm:hidden">採用 ({candidateIds.length})</span>
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="一括採用"
        description={`${candidateIds.length} 件の候補をまとめて採用します。よろしいですか?`}
        confirmLabel="採用する"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        loading={batchMutation.isPending}
      />
    </>
  );
}
