"use client";

import Link from "next/link";
import { NotebookPen, Sparkles } from "lucide-react";
import { buttonVariants } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";

interface ReviewEmptyProps {
  /** 初回ユーザー (カードを 1 枚も持っていない) かどうか */
  hasCards: boolean;
  /** デッキ集中復習中か */
  isDeckScoped: boolean;
  /** 集中中のデッキ名 */
  deckName?: string;
}

/**
 * 復習対象が 0 件のときの案内。
 * 状況に応じて「次の一歩」を必ず提示する (初回=メモ作成 / 完了=別導線)。
 */
export function ReviewEmpty({ hasCards, isDeckScoped, deckName }: ReviewEmptyProps) {
  if (!hasCards) {
    return (
      <div className="mx-auto w-full max-w-md py-6">
        <EmptyState
          icon={<NotebookPen aria-hidden />}
          title="まだ復習するカードがありません"
          description="メモを書いて AI にカード候補を作ってもらいましょう"
          action={
            <Link
              href="/notes/new"
              className={buttonVariants({ size: "touch" })}
            >
              メモを書く
            </Link>
          }
        />
      </div>
    );
  }

  if (isDeckScoped) {
    return (
      <div className="mx-auto w-full max-w-md py-6">
        <EmptyState
          icon={<Sparkles aria-hidden />}
          title={
            deckName
              ? `「${deckName}」の今日の復習は完了しています`
              : "このデッキの今日の復習は完了しています"
          }
          description="他のデッキにはまだ復習が残っているかもしれません"
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/review"
                className={buttonVariants({ size: "touch" })}
              >
                すべてのデッキで復習
              </Link>
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: "outline", size: "touch" })}
              >
                ダッシュボードへ
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md py-6">
      <EmptyState
        icon={<Sparkles aria-hidden />}
        title="今日の復習は完了しています"
        description="明日また戻ってきてください"
        action={
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "outline", size: "touch" })}
          >
            ダッシュボードへ
          </Link>
        }
      />
    </div>
  );
}
