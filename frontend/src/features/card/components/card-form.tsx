"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import {
  useCreateCard,
  useUpdateCard,
} from "../api/card-queries";
import {
  createCardSchema,
  type CreateCardInput,
} from "../schemas/card-schemas";
import { TagPicker } from "@/shared/ui/tag-picker";
import { useCreateTag } from "@/entities/tag/api/tag-queries";
import { useDeckList } from "@/entities/deck/api/deck-queries";
import { buildHierarchicalOptions } from "@/shared/lib/deck-tree";
import {
  CARD_TYPES,
  CARD_TYPE_LABELS,
  SCHEDULERS,
  SCHEDULER_LABELS,
} from "@/entities/card/types";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import type { Card } from "@/entities/card/types";

interface CardFormProps {
  card?: Card;
  defaultDeckId?: number;
  redirectTo?: string;
}

export function CardForm({
  card,
  defaultDeckId,
  redirectTo = "/cards",
}: CardFormProps) {
  const router = useRouter();
  const createMutation = useCreateCard();
  const updateMutation = useUpdateCard(card?.id ?? 0);
  const createTag = useCreateTag();
  const { data: decks } = useDeckList();
  const deckOptions = buildHierarchicalOptions(decks ?? []);
  const isEdit = !!card;
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateCardInput>({
    resolver: zodResolver(createCardSchema),
    defaultValues: {
      deck_id: card?.deck_id ?? defaultDeckId ?? 0,
      question: card?.question ?? "",
      answer: card?.answer ?? "",
      explanation: card?.explanation ?? "",
      card_type: card?.card_type ?? "basic_qa",
      // 新規作成時のデフォルトは FSRS、既存カード編集時はそのカードの値を維持
      scheduler: card?.scheduler ?? "fsrs",
      tag_ids: card?.tags?.map((t) => t.id) ?? [],
    },
  });

  const [pendingValues, setPendingValues] = useState<CreateCardInput | null>(
    null
  );

  async function persistValues(values: CreateCardInput): Promise<void> {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(values);
        toast.success("カードを更新しました");
      } else {
        await createMutation.mutateAsync(values);
        toast.success("カードを作成しました");
      }
      router.push(redirectTo);
    } catch {
      toast.error("保存に失敗しました");
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    // 編集時で scheduler が変わっている場合は、確認ダイアログで進捗リセットを警告
    if (
      isEdit &&
      card &&
      values.scheduler !== undefined &&
      values.scheduler !== card.scheduler
    ) {
      setPendingValues(values);
      return;
    }
    await persistValues(values);
  });

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      onKeyDown={handleKeyDown}
      className="space-y-5 pb-36 md:pb-0"
      noValidate
      aria-label={isEdit ? "カード編集フォーム" : "カード作成フォーム"}
    >
      <div className="space-y-1.5">
        <label htmlFor="deck_id" className="text-sm font-medium">
          デッキ <span className="text-destructive">*</span>
        </label>
        <select
          id="deck_id"
          {...register("deck_id", { valueAsNumber: true })}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11 bg-background"
          aria-invalid={!!errors.deck_id}
        >
          <option value={0}>選択してください</option>
          {deckOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {"— ".repeat(opt.depth)}
              {opt.name}
            </option>
          ))}
        </select>
        {errors.deck_id && (
          <p role="alert" className="text-xs text-destructive">
            {errors.deck_id.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="question" className="text-sm font-medium">
          問題文 <span className="text-destructive">*</span>
        </label>
        <textarea
          id="question"
          rows={3}
          {...register("question")}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm resize-y"
          aria-invalid={!!errors.question}
        />
        {errors.question && (
          <p role="alert" className="text-xs text-destructive">
            {errors.question.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="answer" className="text-sm font-medium">
          回答 <span className="text-destructive">*</span>
        </label>
        <textarea
          id="answer"
          rows={3}
          {...register("answer")}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm resize-y"
          aria-invalid={!!errors.answer}
        />
        {errors.answer && (
          <p role="alert" className="text-xs text-destructive">
            {errors.answer.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="explanation" className="text-sm font-medium">
          補足説明
        </label>
        <textarea
          id="explanation"
          rows={2}
          {...register("explanation")}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm resize-y"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="card_type" className="text-sm font-medium">
          カード種別
        </label>
        <select
          id="card_type"
          {...register("card_type")}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11 bg-background"
        >
          {CARD_TYPES.map((type) => (
            <option key={type} value={type}>
              {CARD_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <Controller
        name="tag_ids"
        control={control}
        render={({ field }) => (
          <TagPicker
            value={field.value ?? []}
            onChange={field.onChange}
            onCreateTag={(name) => createTag.mutateAsync(name)}
            isCreating={createTag.isPending}
          />
        )}
      />

      {/* 詳細設定 (上級者向け、scheduler 選択など) */}
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground min-h-11"
        aria-expanded={showAdvanced}
        aria-controls="card-advanced-fields"
      >
        <ChevronDown
          className={`size-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
          aria-hidden
        />
        詳細設定 (任意)
      </button>

      {showAdvanced && (
        <div id="card-advanced-fields" className="space-y-4 pl-6 border-l">
          <div className="space-y-1.5">
            <label htmlFor="scheduler" className="text-sm font-medium">
              復習アルゴリズム
            </label>
            <select
              id="scheduler"
              {...register("scheduler")}
              className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11 bg-background"
            >
              {SCHEDULERS.map((s) => (
                <option key={s} value={s}>
                  {SCHEDULER_LABELS[s]}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {isEdit
                ? "変更すると学習進捗 (間隔・安定度・難度) はリセットされ、新規カードと同じ状態から再スタートになります"
                : "FSRS は学習履歴から間隔を自動最適化します。SM-2 はシンプルな従来方式。迷ったら FSRS のままで OK。"}
            </p>
          </div>
        </div>
      )}

      <div
        className="
          fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] border-t bg-background/95 backdrop-blur z-30
          p-3 flex gap-2
          md:static md:border-0 md:bg-transparent md:backdrop-blur-0
          md:p-0 md:pb-0 md:justify-end md:flex-row-reverse
        "
      >
        <Button
          type="submit"
          size="lg"
          className="flex-1 md:flex-none min-h-11"
          disabled={isSubmitting}
        >
          {isSubmitting ? "保存中..." : isEdit ? "更新" : "作成"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="min-h-11"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          キャンセル
        </Button>
      </div>

      <ConfirmDialog
        open={pendingValues !== null}
        title="復習アルゴリズムを変更しますか？"
        description={
          pendingValues && card
            ? `${SCHEDULER_LABELS[card.scheduler]} → ${SCHEDULER_LABELS[pendingValues.scheduler ?? "fsrs"]} に切替えると、学習進捗 (間隔・安定度・難度・復習回数) はすべてリセットされ、新規カードとして再スタートになります。アーカイブ済みのカードは学習中に戻ります。よろしいですか？`
            : ""
        }
        confirmLabel="変更してリセットする"
        variant="destructive"
        onConfirm={async () => {
          if (!pendingValues) return;
          // ダイアログを開いたまま persist を await し、完了後に閉じる。
          // updateMutation.isPending が true の間は ConfirmDialog のボタンが
          // disabled になり、二重送信を防ぐ。
          await persistValues(pendingValues);
          setPendingValues(null);
        }}
        onCancel={() => {
          // mutation 進行中はキャンセルさせない (バックエンド処理が走っているため)
          if (updateMutation.isPending) return;
          setPendingValues(null);
        }}
        loading={updateMutation.isPending}
      />
    </form>
  );
}
