"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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

function operatorInitials(name: string) {
  const parts = name.trim().split(/[@\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "OP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function ThreatLevelIndicator({
  level,
}: {
  level: "LOW" | "MED" | "HIGH" | "CRIT";
}) {
  const tone =
    level === "CRIT"
      ? "threat-pill-crit"
      : level === "HIGH"
        ? "threat-pill-warn"
        : level === "MED"
          ? "threat-pill-info"
          : "threat-pill-ok";

  const label =
    level === "CRIT"
      ? "Critical"
      : level === "HIGH"
        ? "High"
        : level === "MED"
          ? "Elevated"
          : "Low";

  return (
    <div
      className={cn("threat-pill", tone)}
      aria-label={`Threat ${label}`}
      title={`Threat level: ${label}`}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          level === "CRIT" || level === "HIGH"
            ? "status-dot-live bg-current"
            : "bg-current opacity-80"
        )}
      />
      <span>Threat {label}</span>
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
    ? sessionId.slice(0, 8).toUpperCase()
    : "None";

  return (
    <div className="scanline flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <header className="topbar-rail z-40 flex h-14 shrink-0 items-center gap-4 px-4">
        <Link
          href="/"
          className="console-focus group flex shrink-0 items-center gap-3 rounded-xl"
        >
          <div className="brand-mark group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_0_1px_hsl(var(--neon-green)/0.28),0_8px_20px_-8px_hsl(var(--neon-green)/0.45)] group-active:scale-95">
            <ShieldAlert className="h-3.5 w-3.5 text-neon-green" strokeWidth={1.75} />
          </div>
          <div className="hidden leading-tight min-[420px]:block">
            <div className="font-sans text-[13px] font-semibold tracking-[-0.03em] text-foreground">
              KYC Breach
            </div>
            <div className="text-[10px] font-medium tracking-[0.04em] text-muted-foreground">
              Console
            </div>
          </div>
        </Link>

        <Link
          href="/operator"
          className="operator-pill console-focus hidden md:inline-flex"
          title="Operator settings"
        >
          <span className="operator-avatar" aria-hidden>
            {operatorInitials(operatorDisplayName)}
          </span>
          <span className="min-w-0 truncate text-[12px] font-medium tracking-[-0.01em] text-foreground/90">
            {operatorDisplayName}
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <div className="topbar-bezel hidden sm:inline-flex">
            <div className="meta-cell hidden lg:flex" title="Active probe target">
              <span className="meta-cell-label">Target</span>
              <span
                className={cn(
                  "meta-cell-value-mono",
                  sessionId ? "text-neon-cyan" : "text-muted-foreground"
                )}
              >
                {activeTargetLabel}
              </span>
            </div>

            {sessionId ? (
              <div className="meta-cell hidden xl:flex" title="Probe status">
                <span className="meta-cell-label">Status</span>
                <span className="meta-cell-value capitalize text-muted-foreground">
                  {status}
                </span>
              </div>
            ) : null}

            <div
              className="meta-cell"
              title="Session uptime"
              aria-label={`Session clock ${formatClock(elapsed)}`}
            >
              <span className="meta-cell-label">Uptime</span>
              <span className="meta-cell-value-mono text-neon-green">
                {formatClock(elapsed)}
              </span>
            </div>
          </div>

          <ThreatLevelIndicator level={sessionId ? "MED" : "LOW"} />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="side-rail hidden w-[15.5rem] shrink-0 flex-col md:flex">
          <div className="side-section-label">Navigate</div>
          <nav className="flex flex-col gap-0.5 px-2.5 pb-3" aria-label="Console">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "nav-item console-focus",
                    active && "nav-item-active"
                  )}
                >
                  <span className="nav-item-icon">
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-line/40">
            <div className="side-section-label flex items-center justify-between pr-3">
              <span>Recent</span>
              <span className="text-[9px] font-medium tracking-normal text-muted-foreground/70 normal-case">
                {recentEngagements.length || "—"}
              </span>
            </div>
            <ul className="scroll-edge-fade space-y-1.5 px-2.5 pb-3">
              {recentEngagements.length === 0 ? (
                <li className="rounded-xl px-2 py-3 text-[11px] text-muted-foreground">
                  No engagements yet
                </li>
              ) : (
                recentEngagements.map((eng) => (
                  <li key={eng.id}>
                    <Link
                      href={`/engagements/${eng.id}`}
                      className="recent-card console-focus"
                    >
                      <div className="truncate text-[12px] font-medium tracking-[-0.015em] text-foreground/90">
                        {eng.label || eng.id.slice(0, 8)}
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                          {eng.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium tracking-[-0.01em] text-neon-green">
                          <span className="h-1 w-1 rounded-full bg-neon-green" />
                          {eng.status === "active"
                            ? "Active"
                            : eng.status.charAt(0).toUpperCase() +
                              eng.status.slice(1)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </aside>

        <nav
          className="side-rail flex shrink-0 flex-col gap-1 p-2 md:hidden"
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
                  "console-focus flex h-10 w-10 items-center justify-center rounded-xl transition-[color,background-color,transform,box-shadow] duration-[var(--response-fast)] ease-[var(--ease-spring)] active:scale-95",
                  active
                    ? "bg-neon-green/10 text-neon-green shadow-[inset_0_0_0_1px_hsl(var(--neon-green)/0.25)]"
                    : "text-muted-foreground hover:bg-surface/50 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
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

        <aside className="glass-rail hidden w-72 shrink-0 xl:block 2xl:w-80">
          <SignalTerminal
            className="h-full border-0 bg-transparent"
            lines={BOOT_LINES}
            label="SIGNAL"
          />
        </aside>
      </div>

      <footer className="glass-rail z-40 flex h-9 shrink-0 items-center gap-3 px-4 text-[11px] tracking-[-0.01em] text-muted-foreground">
        <span>
          FPS <span className="vibrancy">--</span>
        </span>
        <span className="text-line/50">·</span>
        <span className="flex items-center gap-1.5">
          <span className="status-dot-live h-1.5 w-1.5 rounded-full bg-neon-green" />
          Local
        </span>
        <span className="text-line/50">·</span>
        <span>
          MCP <span className="text-neon-cyan">standby</span>
        </span>
        <span className="status-chip status-chip-ok ml-auto normal-case tracking-[-0.01em]">
          <ShieldAlert className="h-3 w-3" strokeWidth={1.75} />
          Authorized
        </span>
      </footer>
    </div>
  );
}
