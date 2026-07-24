"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Camera,
  LayoutDashboard,
  Smartphone,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSessionStore } from "@/lib/session/store";
import { QaModeBanner } from "@/components/qa/QaModeBanner";

const navItems = [
  { href: "/", label: "Capture", icon: Camera, match: (p: string) => p === "/" },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (p: string) => p.startsWith("/dashboard"),
  },
] as const;

interface AppShellProps {
  children: React.ReactNode;
  showQaBanner?: boolean;
}

export function AppShell({ children, showQaBanner = true }: AppShellProps) {
  const pathname = usePathname();
  const sessionId = useSessionStore((s) => s.sessionId);
  const status = useSessionStore((s) => s.status);

  const isController = pathname.startsWith("/controller");
  const isVerify = pathname.startsWith("/verify");

  return (
    <div className="flex min-h-full flex-col bg-background">
      {showQaBanner ? <QaModeBanner /> : null}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-3 px-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
            KYC-Verify
          </Link>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <nav className="flex items-center gap-1" aria-label="Primary">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            {(isController || isVerify) && sessionId ? (
              <span
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium",
                  "bg-accent text-accent-foreground"
                )}
                aria-current="page"
              >
                <Smartphone className="h-4 w-4" />
                {isController ? "Controller" : "Verify"}
              </span>
            ) : null}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {sessionId ? (
              <Badge variant="secondary" className="font-mono text-[10px]">
                {sessionId.slice(0, 8)}
                {status !== "idle" ? ` · ${status}` : ""}
              </Badge>
            ) : null}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
