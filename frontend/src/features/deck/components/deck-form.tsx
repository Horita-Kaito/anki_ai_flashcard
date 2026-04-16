"use client";

import { zodResolver } from "@hookform/resolvers/zod/v4";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCreateDeck, useUpdateDeck } from "../api/deck-queries";
import {
  createDeckSchema,
  type CreateDeckInput,
} from "../schemas/deck-schemas";
import { Button } from "@/shared/ui/button";
import type { Deck } from "@/entities/deck/types";

interface DeckFormProps {
  /** 編集対象。指定すれば編集モード、無指定で作成モード */
  deck?: Deck;
  /** 保存成功後のリダイレクト先。デフォルトは /decks */
  redirectTo?: string;
}

export function DeckForm({ deck, redirectTo = "/decks" }: DeckFormProps) {
  const router = useRouter();
  const createMutation = useCreateDeck();
  const updateMutation = useUpdateDeck(deck?.id ?? 0);
  const isEdit = !!deck;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateDeckInput>({
    resolver: zodResolver(createDeckSchema),
    defaultValues: {
      name: deck?.name ?? "",
      description: deck?.description ?? "",
      new_cards_limit: deck?.new_cards_limit ?? 20,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(values);
        toast.success("デッキを更新しました");
      } else {
        await createMutation.mutateAsync(values);
        toast.success("デッキを作成しました");
      }
      router.push(redirectTo);
    } catch {
      toast.error("保存に失敗しました");
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5"
      noValidate
      aria-label={isEdit ? "デッキ編集フォーム" : "デッキ作成フォーム"}
    >
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          デッキ名 <span className="text-destructive">*</span>
        </label>
        <input
          id="name"
          type="text"
          autoComplete="off"
          {...register("name")}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11"
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p role="alert" className="text-xs text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          説明
        </label>
        <textarea
          id="description"
          rows={3}
          {...register("description")}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm resize-y"
          aria-invalid={!!errors.description}
        />
        {errors.description && (
          <p role="alert" className="text-xs text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="new_cards_limit" className="text-sm font-medium">
          新規カード上限 (1日)
        </label>
        <input
          id="new_cards_limit"
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          {...register("new_cards_limit", { valueAsNumber: true })}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11"
          aria-invalid={!!errors.new_cards_limit}
        />
        {errors.new_cards_limit && (
          <p role="alert" className="text-xs text-destructive">
            {errors.new_cards_limit.message}
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
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
        <Button
          type="submit"
          size="lg"
          className="min-h-11"
          disabled={isSubmitting}
        >
          {isSubmitting ? "保存中..." : isEdit ? "更新" : "作成"}
        </Button>
      </div>
    </form>
  );
}
