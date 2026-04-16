"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useCreateCard,
  useUpdateCard,
} from "../api/card-queries";
import {
  createCardSchema,
  type CreateCardInput,
} from "../schemas/card-schemas";
import { TagPicker } from "@/features/tag";
import { useDeckList } from "@/entities/deck/api/deck-queries";
import { CARD_TYPES, CARD_TYPE_LABELS } from "@/entities/card/types";
import { Button } from "@/shared/ui/button";
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
  const { data: decksPage } = useDeckList();
  const isEdit = !!card;

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
      tag_ids: card?.tags?.map((t) => t.id) ?? [],
    },
  });

  const onSubmit = handleSubmit(async (values) => {
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
      className="space-y-5 pb-24 md:pb-0"
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
          {decksPage?.data.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
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
          />
        )}
      />

      <div
        className="
          fixed inset-x-0 bottom-0 border-t bg-background/95 backdrop-blur
          p-3 flex gap-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]
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
    </form>
  );
}
