import * as React from "react";
import { cn } from "@/lib/utils";
import { ConsoleLabel } from "@/components/ui/console-label";

export interface ConsolePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export function ConsolePanel({
  label,
  headerRight,
  children,
  className,
  ...props
}: ConsolePanelProps) {
  return (
    <div
      className={cn(
        "group/panel flex flex-col overflow-hidden rounded-sm border border-line bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-neon-green/20",
        className
      )}
      {...props}
    >
      {label || headerRight ? (
        <div className="flex items-center justify-between gap-2 border-b border-line/80 bg-console-rail/60 px-3 py-2">
          {label ? <ConsoleLabel>{label}</ConsoleLabel> : <span />}
          {headerRight ? (
            <div className="flex items-center gap-2">{headerRight}</div>
          ) : null}
        </div>
      ) : null}
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
