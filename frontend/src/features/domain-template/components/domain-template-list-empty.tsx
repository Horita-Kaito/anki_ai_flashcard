import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";

import { buttonVariants } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";

export function DomainTemplateListEmpty() {
  return (
    <EmptyState
      icon={<SlidersHorizontal aria-hidden />}
      title="テンプレートがありません"
      description="テンプレートは AI への策問方針です。「資格試験向け」「技術概念向け」のように定義すると、生成されるカードの品質が安定します。"
      action={
        <Link href="/templates/new" className={buttonVariants({ size: "touch" })}>
          最初のテンプレートを作成
        </Link>
      }
    />
  );
}
