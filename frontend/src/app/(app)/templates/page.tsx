import Link from "next/link";
import type { Metadata } from "next";
import { DomainTemplateList } from "@/features/domain-template";
import { buttonVariants } from "@/shared/ui/button";

export const metadata: Metadata = {
  title: "分野テンプレート | Anki AI Flashcard",
};

export default function TemplatesPage() {
  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">分野テンプレート</h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI の策問ポリシーを分野ごとに定義します
            </p>
          </div>
          <Link
            href="/templates/new"
            className={`${buttonVariants({ size: "sm" })} min-h-11 shrink-0`}
          >
            新規作成
          </Link>
        </div>
        <DomainTemplateList />
      </div>
    </main>
  );
}
