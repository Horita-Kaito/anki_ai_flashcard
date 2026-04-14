import type { Metadata } from "next";
import { DomainTemplateForm } from "@/features/domain-template";

export const metadata: Metadata = {
  title: "テンプレート作成 | Anki AI Flashcard",
};

export default function NewTemplatePage() {
  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">
            テンプレートを作成
          </h1>
          <p className="text-sm text-muted-foreground">
            分野ごとの策問ポリシーを定義すると、AI 生成の品質が安定します
          </p>
        </header>
        <DomainTemplateForm />
      </div>
    </main>
  );
}
