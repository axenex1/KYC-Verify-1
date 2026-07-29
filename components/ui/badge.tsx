import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider transition-[color,background-color,border-color] duration-150 focus:outline-none focus:ring-2 focus:ring-neon-green/40 focus:ring-offset-1 focus:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "border-neon-green/30 bg-neon-green/10 text-neon-green",
        secondary:
          "border-line bg-surface text-muted-foreground",
        destructive:
          "border-neon-red/35 bg-neon-red/10 text-neon-red",
        outline: "border-line text-foreground",
        success:
          "border-neon-green/30 bg-neon-green/10 text-neon-green",
        warning:
          "border-neon-amber/35 bg-neon-amber/10 text-neon-amber",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
