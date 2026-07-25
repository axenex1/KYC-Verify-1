"use client";

import { cn } from "@/lib/utils";

type VerifyTab = "liveness" | "document";

interface VerifyTabsProps {
  active: VerifyTab;
  onChange: (tab: VerifyTab) => void;
  className?: string;
}

export function VerifyTabs({ active, onChange, className }: VerifyTabsProps) {
  const tabs: { id: VerifyTab; label: string }[] = [
    { id: "liveness", label: "Liveness" },
    { id: "document", label: "Document Review" },
  ];

  return (
    <div
      className={cn(
        "flex gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900",
        className
      )}
      role="tablist"
      aria-label="Verification session modes"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "min-h-11 flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            active === tab.id
              ? "bg-white text-foreground shadow-sm dark:bg-zinc-800"
              : "text-zinc-600 hover:text-foreground dark:text-zinc-400"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export type { VerifyTab };
