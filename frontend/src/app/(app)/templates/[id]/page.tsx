"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DomainTemplateForm,
  useDomainTemplate,
  useDeleteDomainTemplate,
} from "@/features/domain-template";
import { Button } from "@/shared/ui/button";
import { BackHeader } from "@/shared/ui/back-header";

export default function TemplateEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const templateId = Number(id);
  const { data: template, isLoading, isError } = useDomainTemplate(templateId);
  const deleteMutation = useDeleteDomainTemplate();

  async function handleDelete() {
    if (!template) return;
    if (!confirm(`テンプレート「${template.name}」を削除しますか？`)) return;
    try {
      await deleteMutation.mutateAsync(template.id);
      toast.success("テンプレートを削除しました");
      router.push("/templates");
    } catch {
      toast.error("削除に失敗しました");
    }
  }

  if (isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </main>
    );
  }

  if (isError || !template) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
        <p>テンプレートが見つかりません</p>
        <Button
          onClick={() => router.push("/templates")}
          size="lg"
          className="min-h-11"
        >
          一覧へ
        </Button>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <BackHeader title="テンプレートを編集" />
        <header className="hidden md:block space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">
            テンプレートを編集
          </h1>
          <p className="text-sm text-muted-foreground break-all">
            {template.name}
          </p>
        </header>

        <DomainTemplateForm template={template} />

        <section
          aria-labelledby="danger-zone"
          className="border border-destructive/30 rounded-xl p-4 md:p-5 space-y-3"
        >
          <h2
            id="danger-zone"
            className="text-sm font-medium text-destructive"
          >
            危険な操作
          </h2>
          <p className="text-sm text-muted-foreground">
            このテンプレートを使用しているデッキは既定設定がクリアされます。
          </p>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="min-h-11"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "削除中..." : "テンプレートを削除"}
          </Button>
        </section>
      </div>
    </main>
  );
}
