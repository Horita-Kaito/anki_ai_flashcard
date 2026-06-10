import type { Metadata } from "next";
import { DomainTemplateForm } from "@/features/domain-template";
import { PageShell } from "@/shared/ui/page-shell";

export const metadata: Metadata = {
  title: "テンプレート作成 | Tessera",
};

export default function NewTemplatePage() {
  return (
    <PageShell
      title="テンプレートを作成"
      description="分野ごとの出題形式・難易度・採点観点を先に決めます。"
      maxWidth="2xl"
    >
      <DomainTemplateForm />
    </PageShell>
  );
}
