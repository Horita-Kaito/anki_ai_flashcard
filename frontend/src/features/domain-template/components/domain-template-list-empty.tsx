import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";

export function DomainTemplateListEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 border border-dashed rounded-xl p-8 text-center">
      <div className="space-y-1">
        <p className="font-medium">テンプレートがありません</p>
        <p className="text-sm text-muted-foreground">
          分野ごとの策問ポリシーを定義すると、AI生成の品質が安定します
        </p>
      </div>
      <Link
        href="/templates/new"
        className={`${buttonVariants({ size: "lg" })} min-h-11`}
      >
        最初のテンプレートを作成
      </Link>
    </div>
  );
}
