import * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-sm border border-line/50 bg-surface",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.2s_ease-out_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.04] before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
