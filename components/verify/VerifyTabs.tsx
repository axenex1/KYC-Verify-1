"use client";

import { cn } from "@/lib/utils";

type VerifyTab = "liveness" | "document" | "generate";

interface VerifyTabsProps {
  active: VerifyTab;
  onChange: (tab: VerifyTab) => void;
  className?: string;
}

export function VerifyTabs({ active, onChange, className }: VerifyTabsProps) {
  const tabs: { id: VerifyTab; label: string }[] = [
    { id: "liveness", label: "Liveness" },
    { id: "document", label: "Document QA" },
    { id: "generate", label: "Document Gen" },
  ];

  return (
    <div
      className={cn(
        "flex gap-1 rounded-sm border border-line bg-console-rail p-1",
        className
      )}
      role="tablist"
      aria-label="QA session modes"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "min-h-10 flex-1 rounded-sm px-3 py-2 font-mono text-xs font-medium uppercase tracking-wider transition-[color,background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98]",
            active === tab.id
              ? "bg-surface text-neon-green shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export type { VerifyTab };
