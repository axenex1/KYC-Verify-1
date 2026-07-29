"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Crosshair,
  FileWarning,
  Home,
  Library,
  PlusCircle,
  Settings,
  ShieldAlert,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConsoleLabel } from "@/components/ui/console-label";
import { SignalTerminal } from "@/components/ui/signal-terminal";
import { useSessionStore } from "@/lib/session/store";
import { usePreferencesStore } from "@/lib/preferences/store";

const navItems = [
  {
    href: "/",
    label: "Mission Control",
    icon: Home,
    match: (p: string) => p === "/",
  },
  {
    href: "/targets",
    label: "Targets",
    icon: Target,
    match: (p: string) => p.startsWith("/targets"),
  },
  {
    href: "/engagements/new",
    label: "Engagements",
    icon: PlusCircle,
    match: (p: string) => p.startsWith("/engagements"),
  },
  {
    href: "/vectors",
    label: "Vectors",
    icon: Library,
    match: (p: string) => p.startsWith("/vectors"),
  },
  {
    href: "/findings",
    label: "Findings",
    icon: FileWarning,
    match: (p: string) => p.startsWith("/findings"),
  },
  {
    href: "/operator",
    label: "Operator",
    icon: Settings,
    match: (p: string) => p.startsWith("/operator") || p.startsWith("/settings"),
  },
] as const;

const BOOT_LINES = [
  "KYC_BREACH//CONSOLE boot…",
  "loading operator profile…",
  "MCP runner: standby",
  "signal bus online",
  "AUTHORIZED ENGAGEMENT mode armed",
  "awaiting target selection",
];

interface AppShellProps {
  children: React.ReactNode;
  /** @deprecated QaModeBanner removed; authorized badge lives in status strip */
  showQaBanner?: boolean;
}

function formatClock(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((total % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function ThreatLevelIndicator({
  level,
}: {
  level: "LOW" | "MED" | "HIGH" | "CRIT";
}) {
  const color =
    level === "CRIT"
      ? "text-neon-red border-neon-red/50 bg-neon-red/5"
      : level === "HIGH"
        ? "text-neon-amber border-neon-amber/50 bg-neon-amber/5"
        : level === "MED"
          ? "text-neon-cyan border-neon-cyan/50 bg-neon-cyan/5"
          : "text-neon-green border-neon-green/50 bg-neon-green/5";

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors duration-200",
        color
      )}
    >
      <Crosshair className="h-3 w-3" />
      THREAT {level}
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const sessionId = useSessionStore((s) => s.sessionId);
  const status = useSessionStore((s) => s.status);
  const operatorDisplayName = usePreferencesStore((s) => s.operatorDisplayName);
  const hydratePrefs = usePreferencesStore((s) => s.hydrate);
  const [elapsed, setElapsed] = React.useState(0);
  const [recentEngagements, setRecentEngagements] = React.useState<
    { id: string; label: string; status: string }[]
  >([]);
  const bootAt = React.useRef(Date.now());

  React.useEffect(() => {
    hydratePrefs();
  }, [hydratePrefs]);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setElapsed(Date.now() - bootAt.current);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    async function loadRecent() {
      try {
        const res = await fetch("/api/engagements");
        if (!res.ok) return;
        const data = (await res.json()) as {
          engagements?: { id: string; name: string; status: string }[];
        };
        if (cancelled) return;
        setRecentEngagements(
          (data.engagements ?? []).slice(0, 4).map((e) => ({
            id: e.id,
            label: e.name,
            status: e.status,
          }))
        );
      } catch {
        /* rail stays empty on failure */
      }
    }
    void loadRecent();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const activeTargetLabel = sessionId
    ? `SESSION ${sessionId.slice(0, 8)}`
    : "NO TARGET";

  return (
    <div className="scanline flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <header className="glass-rail z-40 flex h-11 shrink-0 items-center gap-3 border-b border-line px-3">
        <Link
          href="/"
          className="console-focus group flex shrink-0 items-center gap-2 rounded-sm"
        >
          <div className="flex h-6 w-6 items-center justify-center bg-neon-green/10 ring-1 ring-neon-green/25 transition-transform duration-150 group-active:scale-95">
            <ShieldAlert className="h-3.5 w-3.5 text-neon-green" />
          </div>
          <div className="leading-none">
            <span className="font-mono text-sm font-semibold tracking-wider text-neon-green">
              KYC_BREACH
            </span>
            <span className="ml-1 hidden font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
              //CONSOLE
            </span>
          </div>
        </Link>

        <div className="hidden h-4 w-px bg-line sm:block" />

        <div className="hidden items-center gap-2 font-mono text-[11px] text-muted-foreground md:flex">
          <ConsoleLabel>OPERATOR</ConsoleLabel>
          <span className="text-foreground/90">{operatorDisplayName}</span>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 border border-line bg-surface/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground lg:flex">
            <ConsoleLabel>TARGET</ConsoleLabel>
            <span
              className={cn(
                sessionId ? "text-neon-cyan" : "text-muted-foreground"
              )}
            >
              {activeTargetLabel}
            </span>
            {sessionId ? (
              <span className="text-muted-foreground">· {status}</span>
            ) : null}
          </div>

          <div className="hidden items-center gap-2 border border-line bg-surface/40 px-2 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground sm:flex">
            <ConsoleLabel>CLOCK</ConsoleLabel>
            <span className="text-neon-green">{formatClock(elapsed)}</span>
          </div>

          <ThreatLevelIndicator level={sessionId ? "MED" : "LOW"} />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="glass-rail hidden w-52 shrink-0 flex-col border-r border-line md:flex">
          <div className="border-b border-line px-3 py-2">
            <ConsoleLabel>NAV</ConsoleLabel>
          </div>
          <nav className="flex flex-col gap-0.5 p-2" aria-label="Console">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "console-focus flex items-center gap-2 rounded-sm px-2 py-1.5 font-mono text-xs transition-[color,background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98]",
                    active
                      ? "bg-neon-green/10 text-neon-green shadow-[inset_2px_0_0_hsl(var(--neon-green))]"
                      : "text-muted-foreground hover:bg-surface hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-line">
            <div className="px-3 py-2">
              <ConsoleLabel>RECENT</ConsoleLabel>
            </div>
            <ul className="space-y-1 px-2 pb-3">
              {recentEngagements.length === 0 ? (
                <li className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
                  no engagements yet
                </li>
              ) : (
                recentEngagements.map((eng) => (
                  <li key={eng.id}>
                    <Link
                      href={`/engagements/${eng.id}`}
                      className="block rounded-sm border border-line/60 bg-surface/30 px-2 py-1.5 font-mono text-[10px] text-muted-foreground transition-[border-color,color,background-color,transform] duration-150 hover:border-neon-green/30 hover:bg-surface hover:text-foreground active:scale-[0.99]"
                    >
                      <div className="truncate text-foreground/80">
                        {eng.label || eng.id.slice(0, 8)}
                      </div>
                      <div className="mt-0.5 flex justify-between uppercase tracking-wider">
                        <span>{eng.id.slice(0, 8)}</span>
                        <span>{eng.status}</span>
                      </div>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </aside>

        <nav
          className="glass-rail flex shrink-0 flex-col gap-1 border-r border-line p-1.5 md:hidden"
          aria-label="Console mobile"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "console-focus flex h-8 w-8 items-center justify-center rounded-sm transition-colors duration-150 active:scale-95",
                  active
                    ? "bg-neon-green/10 text-neon-green"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </Link>
            );
          })}
        </nav>

        <main
          key={pathname}
          className="page-enter relative z-10 min-h-0 min-w-0 flex-1 overflow-auto"
        >
          {children}
        </main>

        <aside className="hidden w-72 shrink-0 border-l border-line xl:block 2xl:w-80">
          <SignalTerminal
            className="h-full border-0"
            lines={BOOT_LINES}
            label="SIGNAL"
          />
        </aside>
      </div>

      <footer className="glass-rail z-40 flex h-8 shrink-0 items-center gap-3 border-t border-line px-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>
          FPS <span className="text-foreground/80">--</span>
        </span>
        <span className="text-line">|</span>
        <span className="flex items-center gap-1.5">
          <span className="status-dot-live h-1.5 w-1.5 rounded-full bg-neon-green" />
          CONN <span className="text-neon-green">LOCAL</span>
        </span>
        <span className="text-line">|</span>
        <span>
          MCP <span className="text-neon-cyan">STANDBY</span>
        </span>
        <span className="ml-auto flex items-center gap-1.5 border border-neon-green/35 bg-neon-green/10 px-2 py-0.5 text-neon-green shadow-[inset_0_1px_0_rgba(0,255,136,0.08)]">
          <ShieldAlert className="h-3 w-3" />
          AUTHORIZED ENGAGEMENT
        </span>
      </footer>
    </div>
  );
}
