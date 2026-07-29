import * as React from "react";
import { cn } from "@/lib/utils";

export interface ConsoleLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

export function ConsoleLabel({
  children,
  className,
  ...props
}: ConsoleLabelProps) {
  return (
    <span className={cn("console-label", className)} {...props}>
      {children}
    </span>
  );
}
