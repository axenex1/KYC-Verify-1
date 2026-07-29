import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input/80 bg-console-rail/70 px-3 py-2 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 backdrop-blur-sm transition-[border-color,box-shadow,background-color] duration-[var(--response-fast)] ease-[var(--ease-spring)] focus-visible:outline-none focus-visible:border-neon-green/40 focus-visible:ring-2 focus-visible:ring-neon-green/30 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
