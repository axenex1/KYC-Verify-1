"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Camera,
  Command,
  LayoutDashboard,
  ListChecks,
  Radio,
  Smartphone,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSessionStore } from "@/lib/session/store";
import { QaModeBanner } from "@/components/qa/QaModeBanner";
import { BrandMark } from "@/components/layout/BrandMark";

const navItems = [
  { href: "/", label: "Capture", icon: Camera, match: (p: string) => p === "/" },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (p: string) => p.startsWith("/dashboard"),
  },
  {
    href: "/prompt-sets",
    label: "Prompt Sets",
    icon: ListChecks,
    match: (p: string) => p.startsWith("/prompt-sets"),
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
  const providerId = useSessionStore((s) => s.providerId);

  const isController = pathname.startsWith("/controller");
  const isVerify = pathname.startsWith("/verify");

  return (
    <div className="relative flex min-h-full flex-col overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#22d3ee1f,transparent_30%),radial-gradient(circle_at_80%_20%,#a855f71f,transparent_22%),linear-gradient(180deg,#020617_0%,#020817_45%,#030712_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(56,189,248,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.14)_1px,transparent_1px)] [background-size:120px_120px]"
      />
      {showQaBanner ? <QaModeBanner /> : null}
      <header className="sticky top-0 z-40 border-b border-cyan-400/10 bg-slate-950/80 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/70">
        <div className="mx-auto flex min-h-16 max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BrandMark compact />
          </Link>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <nav className="flex flex-wrap items-center gap-1" aria-label="Primary">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-cyan-400/40 bg-cyan-400/12 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.16)]"
                      : "border-white/8 bg-white/5 text-slate-300 hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-100"
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
                  "flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/12 px-3 py-1.5 text-sm font-medium text-cyan-100"
                )}
                aria-current="page"
              >
                <Smartphone className="h-4 w-4" />
                {isController ? "Controller" : "Verify"}
              </span>
            ) : null}
          </nav>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <Badge variant="secondary" className="gap-1 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-fuchsia-100">
              <Workflow className="h-3.5 w-3.5" />
              Desktop workflow
            </Badge>
            {providerId ? (
              <Badge variant="secondary" className="gap-1 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-100">
                <Command className="h-3.5 w-3.5" />
                {providerId}
              </Badge>
            ) : null}
            {sessionId ? (
              <Badge variant="secondary" className="gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 font-mono text-[10px] text-emerald-100">
                <Radio className="h-3.5 w-3.5" />
                {sessionId.slice(0, 8)}
                {status !== "idle" ? ` · ${status}` : ""}
              </Badge>
            ) : null}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-[1600px] flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
