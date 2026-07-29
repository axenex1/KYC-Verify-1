"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Crosshair,
  FileWarning,
  Loader2,
  PlusCircle,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConsolePanel } from "@/components/ui/console-panel";
import { ConsoleLabel } from "@/components/ui/console-label";
import { cn } from "@/lib/utils";
import type { Engagement } from "@/types/engagement";
import type { Finding } from "@/types/findings";
import type { Target as KycTarget } from "@/types/targets";
import {
  engagementStatusClass,
  severityClass,
  targetStatusClass,
  triageClass,
} from "@/lib/console/status";

interface BoardStats {
  activeEngagements: number;
  openFindings: number;
  targetsOnline: number;
  criticalFindings: number;
  remediatedFindings: number;
  totalFindings: number;
}

function formatPct(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "n/a";
  return `${Math.round(n * 100)}%`;
}

export default function MissionControlPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [targets, setTargets] = useState<KycTarget[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [engRes, tgtRes, findRes] = await Promise.all([
          fetch("/api/engagements"),
          fetch("/api/targets"),
          fetch("/api/findings"),
        ]);
        if (!engRes.ok || !tgtRes.ok || !findRes.ok) {
          throw new Error("board_fetch_failed");
        }
        const engJson = (await engRes.json()) as { engagements: Engagement[] };
        const tgtJson = (await tgtRes.json()) as { targets: KycTarget[] };
        const findJson = (await findRes.json()) as { findings: Finding[] };
        if (cancelled) return;
        setEngagements(engJson.engagements ?? []);
        setTargets(tgtJson.targets ?? []);
        setFindings(findJson.findings ?? []);
      } catch {
        if (!cancelled) setError("Threat board sync failed. Retry refresh.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats: BoardStats = {
    activeEngagements: engagements.filter((e) => e.status === "active").length,
    openFindings: findings.filter((f) => f.triageState === "open").length,
    targetsOnline: targets.filter((t) => t.status === "active").length,
    criticalFindings: findings.filter((f) => f.severity === "critical").length,
    remediatedFindings: findings.filter((f) => f.triageState === "remediated")
      .length,
    totalFindings: findings.length,
  };

  const remediationRate =
    stats.totalFindings > 0
      ? stats.remediatedFindings / stats.totalFindings
      : null;
  const openRate =
    stats.totalFindings > 0 ? stats.openFindings / stats.totalFindings : null;

  const activeEngagements = engagements
    .filter((e) => e.status === "active" || e.status === "draft")
    .slice(0, 8);
  const recentFindings = [...findings]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 6);

  const targetName = (id: string | null | undefined) =>
    targets.find((t) => t.id === id)?.name ?? id?.slice(0, 12) ?? "n/a";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-background">
      <div className="pointer-events-none absolute inset-0 grid-rules opacity-30" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <ConsoleLabel>MISSION CONTROL</ConsoleLabel>
            <h1 className="mt-1.5 font-mono text-xl font-semibold tracking-[-0.02em] text-foreground sm:text-2xl">
              Threat board
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Active engagements, target registry, and open findings for
              authorized KYC red-team ops.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="console">
              <Link href="/engagements/new">
                <PlusCircle className="h-4 w-4" />
                New Engagement
                <ChevronRight className="h-4 w-4 opacity-60" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="font-mono text-neon-cyan">
              <Link href="/targets">
                <Target className="h-4 w-4" />
                Targets
              </Link>
            </Button>
            <Button asChild variant="outline" className="font-mono text-neon-amber">
              <Link href="/findings">
                <FileWarning className="h-4 w-4" />
                Findings
              </Link>
            </Button>
          </div>
        </div>

        {error ? (
          <div className="border border-neon-red/30 bg-neon-red/5 px-3 py-2 font-mono text-xs text-neon-red">
            [!] {error}
          </div>
        ) : null}

        {/* Stats */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              key: "active_eng",
              label: "active_engagements",
              value: loading ? "…" : String(stats.activeEngagements),
              color: "text-neon-green",
            },
            {
              key: "open_find",
              label: "open_findings",
              value: loading ? "…" : String(stats.openFindings),
              color: "text-neon-amber",
            },
            {
              key: "tgt_online",
              label: "targets_online",
              value: loading ? "…" : String(stats.targetsOnline),
              color: "text-neon-cyan",
            },
            {
              key: "rates",
              label: "open_rate / remediated",
              value: loading
                ? "…"
                : `${formatPct(openRate)} / ${formatPct(remediationRate)}`,
              color: "text-neon-red",
            },
          ].map((stat) => (
            <div
              key={stat.key}
              className="border border-line bg-surface px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[border-color] duration-150 hover:border-neon-green/20"
            >
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </div>
              <div
                className={cn(
                  "mt-1 font-mono text-2xl font-semibold tabular-nums",
                  stat.color
                )}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ConsolePanel
            label="ACTIVE ENGAGEMENTS"
            headerRight={
              <Link
                href="/engagements/new"
                className="font-mono text-[10px] uppercase tracking-wider text-neon-green hover:underline"
              >
                + mint
              </Link>
            }
          >
            <div className="divide-y divide-line">
              {loading ? (
                <div className="flex items-center gap-2 px-3 py-6 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="font-mono text-xs">syncing…</span>
                </div>
              ) : activeEngagements.length === 0 ? (
                <div className="px-3 py-6 font-mono text-xs text-muted-foreground">
                  No active engagements. Mint one to begin a probe run.
                </div>
              ) : (
                activeEngagements.map((eng) => (
                  <Link
                    key={eng.id}
                    href={`/engagements/${eng.id}/probe`}
                    className="flex items-center gap-3 px-3 py-2.5 transition-[background-color,transform] duration-150 hover:bg-surface-elevated active:scale-[0.995]"
                  >
                    <Crosshair className="h-3.5 w-3.5 shrink-0 text-neon-green" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-mono text-xs text-foreground">
                        {eng.name || eng.id.slice(0, 8)}
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                        {targetName(eng.targetId)} ·{" "}
                        {eng.attackSurface.join(", ") || "no surface"}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 font-mono text-[10px] uppercase tracking-wider",
                        engagementStatusClass(eng.status)
                      )}
                    >
                      {eng.status}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </ConsolePanel>

          <ConsolePanel
            label="TARGET REGISTRY"
            headerRight={
              <span className="font-mono text-[10px] text-muted-foreground">
                {targets.length} registered
              </span>
            }
          >
            <div className="divide-y divide-line">
              {loading ? (
                <div className="flex items-center gap-2 px-3 py-6 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="font-mono text-xs">syncing…</span>
                </div>
              ) : targets.length === 0 ? (
                <div className="px-3 py-6 font-mono text-xs text-muted-foreground">
                  No targets seeded.
                </div>
              ) : (
                targets.map((t) => {
                  const findingCount = findings.filter(
                    (f) => f.targetId === t.id
                  ).length;
                  return (
                    <Link
                      key={t.id}
                      href="/targets"
                      className="flex items-center gap-3 px-3 py-2.5 transition-[background-color,transform] duration-150 hover:bg-surface-elevated active:scale-[0.995]"
                    >
                      <Target className="h-3.5 w-3.5 shrink-0 text-neon-cyan" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-mono text-xs text-foreground">
                          {t.name}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {t.vendor} · {t.adapterType} · {findingCount} findings
                        </div>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 font-mono text-[10px] uppercase tracking-wider",
                          targetStatusClass(t.status)
                        )}
                      >
                        {t.status}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </ConsolePanel>
        </div>

        <ConsolePanel
          label="RECENT FINDINGS"
          headerRight={
            <Link
              href="/findings"
              className="font-mono text-[10px] uppercase tracking-wider text-neon-amber hover:underline"
            >
              triage →
            </Link>
          }
        >
          <div className="divide-y divide-line">
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-6 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-mono text-xs">syncing…</span>
              </div>
            ) : recentFindings.length === 0 ? (
              <div className="px-3 py-6 font-mono text-xs text-muted-foreground">
                No findings yet. Probe runs will auto-file detections here.
              </div>
            ) : (
              recentFindings.map((f) => (
                <Link
                  key={f.id}
                  href="/findings"
                  className="flex items-start gap-3 px-3 py-2.5 transition-[background-color,transform] duration-150 hover:bg-surface-elevated active:scale-[0.995]"
                >
                  <FileWarning
                    className={cn(
                      "mt-0.5 h-3.5 w-3.5 shrink-0",
                      severityClass(f.severity)
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-xs text-foreground">
                      {f.title}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {targetName(f.targetId)} · {f.vector ?? "n/a"} ·{" "}
                      <span className={severityClass(f.severity)}>
                        {f.severity}
                      </span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 font-mono text-[10px] uppercase tracking-wider",
                      triageClass(f.triageState)
                    )}
                  >
                    {f.triageState}
                  </span>
                </Link>
              ))
            )}
          </div>
        </ConsolePanel>

        {stats.criticalFindings > 0 ? (
          <p className="font-mono text-[10px] text-neon-red/80">
            [!] {stats.criticalFindings} critical finding
            {stats.criticalFindings === 1 ? "" : "s"} require triage
          </p>
        ) : null}
      </div>
    </div>
  );
}
