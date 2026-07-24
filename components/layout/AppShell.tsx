"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Camera,
  LayoutDashboard,
  Smartphone,
  FlaskConical,
  ArrowLeft,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/lib/session/store";
import { QaModeBanner } from "@/components/qa/QaModeBanner";

const navItems = [
  {
    href: "/",
    label: "Capture",
    icon: Camera,
    match: (p: string) => p === "/",
  },
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

function SessionStatusBadge({
  sessionId,
  status,
}: {
  sessionId: string;
  status: string;
}) {
  const variant =
    status === "completed"
      ? ("success" as const)
      : status === "error"
        ? ("destructive" as const)
        : status === "active"
          ? ("warning" as const)
          : ("secondary" as const);

  return (
    <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1 shadow-sm">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          status === "completed" && "bg-emerald-500",
          status === "active" && "bg-amber-500 animate-pulse",
          status === "error" && "bg-red-500",
          status === "idle" && "bg-zinc-400",
          status === "initializing" && "bg-blue-500 animate-pulse"
        )}
      />
      <code className="text-xs font-mono text-muted-foreground">
        {sessionId.slice(0, 8)}
      </code>
      <span className="text-xs text-muted-foreground">· {status}</span>
    </div>
  );
}

export function AppShell({ children, showQaBanner = true }: AppShellProps) {
  const pathname = usePathname();
  const sessionId = useSessionStore((s) => s.sessionId);
  const status = useSessionStore((s) => s.status);

  const isController = pathname.startsWith("/controller");
  const isVerify = pathname.startsWith("/verify");
  const isSessionView = isController || isVerify;
  const isHome = pathname === "/";

  return (
    <div className="flex min-h-full flex-col bg-background">
      {showQaBanner ? <QaModeBanner /> : null}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-3 px-4">
          {/* Home / Back navigation */}
          {isSessionView ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Home</span>
              </Link>
            </Button>
          ) : (
            <Link
              href="/"
              className="flex items-center gap-2 text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm shrink-0"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/20">
                <FlaskConical className="h-3.5 w-3.5 text-primary" />
              </div>
              KYC-Verify
            </Link>
          )}

          <Separator orientation="vertical" className="mx-1 h-5" />

          {/* Primary Nav */}
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
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
            {isSessionView && sessionId ? (
              <span
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium",
                  "bg-accent text-accent-foreground"
                )}
                aria-current="page"
              >
                <Smartphone className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {isController ? "Controller" : "Verify"}
                </span>
              </span>
            ) : null}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {sessionId ? (
              <SessionStatusBadge sessionId={sessionId} status={status} />
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
