import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { DomainTemplateList } from "@/features/domain-template";
import { buttonVariants } from "@/shared/ui/button";
import { PageShell } from "@/shared/ui/page-shell";

export const metadata: Metadata = {
  title: "分野テンプレート | まとメモAI",
};

export default function TemplatesPage() {
  return (
    <PageShell
      title="分野テンプレート"
      description="分野ごとの出題方針を決めて、AI 候補の粒度と品質を安定させます。"
      action={
        <Link
          href="/templates/new"
          className={`${buttonVariants({ size: "lg" })} min-h-11`}
        >
          <Plus className="size-4" aria-hidden />
          テンプレート作成
        </Link>
      }
    >
      <DomainTemplateList />
    </PageShell>
  );
}
