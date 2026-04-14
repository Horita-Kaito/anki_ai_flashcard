import Link from "next/link";
import { FileText } from "lucide-react";
import type { DomainTemplate } from "@/entities/domain-template/types";

interface DomainTemplateListItemProps {
  template: DomainTemplate;
}

export function DomainTemplateListItem({
  template,
}: DomainTemplateListItemProps) {
  const priorityCount = template.instruction_json.priorities?.length ?? 0;

  return (
    <li>
      <Link
        href={`/templates/${template.id}`}
        className="group flex items-start gap-3 border rounded-xl p-4 min-h-16 bg-card hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        aria-label={`テンプレート ${template.name} を開く`}
      >
        <span
          aria-hidden
          className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0"
        >
          <FileText className="size-5" />
        </span>
        <span className="flex-1 min-w-0 space-y-1">
          <span className="block font-medium truncate">{template.name}</span>
          <span className="block text-sm text-muted-foreground line-clamp-2">
            {template.instruction_json.goal}
          </span>
          <span className="block text-xs text-muted-foreground">
            優先観点 {priorityCount} 件
          </span>
        </span>
      </Link>
    </li>
  );
}
