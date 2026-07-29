import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "status-chip inline-flex items-center font-medium focus:outline-none focus:ring-2 focus:ring-neon-green/40 focus:ring-offset-1 focus:ring-offset-background",
  {
    variants: {
      variant: {
        default: "status-chip-ok",
        secondary: "status-chip-neutral",
        destructive: "status-chip-crit",
        outline: "status-chip-neutral vibrancy",
        success: "status-chip-ok",
        warning: "status-chip-warn",
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
