"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ConsoleLabel } from "@/components/ui/console-label";

export interface SignalTerminalProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  lines: string[];
  /** When provided, appends this line once per distinct value (live feed). */
  appendLine?: string | null;
  maxLines?: number;
  label?: string;
}

function lineTone(line: string): string {
  const lower = line.toLowerCase();
  if (lower.includes("fail") || lower.includes("error") || lower.includes("crit")) {
    return "text-neon-red/90";
  }
  if (lower.includes("warn") || lower.includes("retry") || lower.includes("review")) {
    return "text-neon-amber/90";
  }
  if (lower.includes("pass") || lower.includes("ok") || lower.includes("armed")) {
    return "text-neon-green/90";
  }
  return "text-neon-cyan/85";
}

export function SignalTerminal({
  lines: initialLines,
  appendLine,
  maxLines = 200,
  label = "SIGNAL",
  className,
  ...props
}: SignalTerminalProps) {
  const [lines, setLines] = React.useState<string[]>(initialLines);
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const lastAppended = React.useRef<string | null>(null);

  React.useEffect(() => {
    setLines(initialLines);
  }, [initialLines]);

  React.useEffect(() => {
    if (!appendLine || appendLine === lastAppended.current) return;
    lastAppended.current = appendLine;
    setLines((prev) => {
      const next = [...prev, appendLine];
      return next.length > maxLines ? next.slice(next.length - maxLines) : next;
    });
  }, [appendLine, maxLines]);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col border border-line bg-console-rail shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <ConsoleLabel>{label}</ConsoleLabel>
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="status-dot-live h-1.5 w-1.5 rounded-full bg-neon-green" />
          {lines.length} ln
        </span>
      </div>
      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-relaxed [scrollbar-width:thin]"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {lines.map((line, i) => (
          <div
            key={`${i}-${line.slice(0, 24)}`}
            className={cn(
              "whitespace-pre-wrap break-all transition-opacity duration-150",
              lineTone(line)
            )}
          >
            <span className="mr-2 select-none text-muted-foreground/45">
              {String(i + 1).padStart(3, "0")}
            </span>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
