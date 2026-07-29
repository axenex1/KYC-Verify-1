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
        "group/panel glass-panel flex flex-col overflow-hidden rounded-lg transition-[border-color,box-shadow,transform] duration-[var(--response-ui)] ease-[var(--ease-spring)] hover:border-neon-green/25 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_28px_-14px_hsl(220_20%_2%/0.6)]",
        className
      )}
      {...props}
    >
      {label || headerRight ? (
        <div className="material-header flex items-center justify-between gap-2 px-3.5 py-2.5">
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
