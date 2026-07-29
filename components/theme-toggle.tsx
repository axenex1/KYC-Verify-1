"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          className="relative h-8 w-8 rounded-full border border-line/40 bg-surface/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-line/70 hover:bg-surface/55"
        >
          <Sun
            className="h-3.5 w-3.5 rotate-0 scale-100 transition-[transform,opacity] duration-[var(--response-ui)] ease-[var(--ease-spring)] dark:-rotate-90 dark:scale-0 dark:opacity-0"
            strokeWidth={1.75}
          />
          <Moon
            className="absolute h-3.5 w-3.5 rotate-90 scale-0 opacity-0 transition-[transform,opacity] duration-[var(--response-ui)] ease-[var(--ease-spring)] dark:rotate-0 dark:scale-100 dark:opacity-100"
            strokeWidth={1.75}
          />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[9rem] rounded-xl border-line/60 bg-surface/95 p-1 text-xs backdrop-blur-xl"
      >
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="rounded-lg"
        >
          <Sun className="mr-2 h-3.5 w-3.5" strokeWidth={1.75} />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="rounded-lg"
        >
          <Moon className="mr-2 h-3.5 w-3.5" strokeWidth={1.75} />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="rounded-lg"
        >
          <Monitor className="mr-2 h-3.5 w-3.5" strokeWidth={1.75} />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
