"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "next-themes";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface group-[.toaster]:text-foreground group-[.toaster]:border-line group-[.toaster]:shadow-[0_16px_48px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.04)] group-[.toaster]:rounded-sm group-[.toaster]:font-mono group-[.toaster]:text-xs",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-neon-green/15 group-[.toast]:text-neon-green group-[.toast]:border group-[.toast]:border-neon-green/30",
          cancelButton:
            "group-[.toast]:bg-console-rail group-[.toast]:text-muted-foreground group-[.toast]:border group-[.toast]:border-line",
          success: "group-[.toaster]:border-neon-green/35",
          error: "group-[.toaster]:border-neon-red/35",
          warning: "group-[.toaster]:border-neon-amber/35",
        },
      }}
      {...props}
    />
  );
}
