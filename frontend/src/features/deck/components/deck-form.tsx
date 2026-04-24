"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCreateDeck, useUpdateDeck } from "../api/deck-queries";
import {
  createDeckSchema,
  type CreateDeckInput,
} from "../schemas/deck-schemas";
import { useDeckList } from "@/entities/deck/api/deck-queries";
import {
  buildHierarchicalOptions,
  isDescendantOrSelf,
} from "../lib/deck-tree";
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
  const { data: allDecks } = useDeckList();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateDeckInput>({
    resolver: zodResolver(createDeckSchema),
    defaultValues: {
      name: deck?.name ?? "",
      description: deck?.description ?? "",
      parent_id: deck?.parent_id ?? null,
    },
  });

  const parentOptions = buildHierarchicalOptions(allDecks ?? []).filter(
    // 編集時は自身とその子孫を親候補から除外 (循環防止)
    (opt) => !deck || !isDescendantOrSelf(allDecks ?? [], deck.id, opt.id),
  );

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
        <label htmlFor="parent_id" className="text-sm font-medium">
          親デッキ (任意)
        </label>
        <Controller
          name="parent_id"
          control={control}
          render={({ field }) => (
            <select
              id="parent_id"
              value={field.value ?? ""}
              onChange={(e) =>
                field.onChange(e.target.value === "" ? null : Number(e.target.value))
              }
              className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11 bg-background"
            >
              <option value="">— 親を持たない (ルート) —</option>
              {parentOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {"— ".repeat(opt.depth)}
                  {opt.name}
                </option>
              ))}
            </select>
          )}
        />
        <p className="text-xs text-muted-foreground">
          例: 「マーケティング」の下に「PESOモデル」を置くと、マーケティングを選んで復習した時にまとめて出題されます。
        </p>
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
