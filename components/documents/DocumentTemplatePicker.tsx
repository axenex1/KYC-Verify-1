"use client";

import { cn } from "@/lib/utils";
import { DOCUMENT_TEMPLATES } from "@/lib/documents/templates";

interface DocumentTemplatePickerProps {
  selectedId: string;
  onSelect: (templateId: string) => void;
  className?: string;
}

export function DocumentTemplatePicker({
  selectedId,
  onSelect,
  className,
}: DocumentTemplatePickerProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium">Mock document template</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Synthetic layouts only - clearly labeled as test documents.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {DOCUMENT_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.id)}
            className={cn(
              "rounded-lg border px-3 py-3 text-left text-sm transition-colors min-h-11",
              selectedId === template.id
                ? "border-foreground bg-zinc-100 dark:bg-zinc-800"
                : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
            )}
          >
            <span className="font-medium">{template.label}</span>
            <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
              {template.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
