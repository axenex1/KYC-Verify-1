"use client";

import * as React from "react";
import Link from "next/link";
import { ConsolePanel } from "@/components/ui/console-panel";
import { ConsoleLabel } from "@/components/ui/console-label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Finding, TriageState } from "@/types/findings";
import { cn } from "@/lib/utils";

const COLUMNS: { id: TriageState; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "confirmed", label: "Confirmed" },
  { id: "reported", label: "Reported" },
  { id: "remediated", label: "Remediated" },
];

const NEXT: Record<TriageState, TriageState | null> = {
  open: "confirmed",
  confirmed: "reported",
  reported: "remediated",
  remediated: null,
};

const PREV: Record<TriageState, TriageState | null> = {
  open: null,
  confirmed: "open",
  reported: "confirmed",
  remediated: "reported",
};

function severityClass(severity: Finding["severity"]): string {
  switch (severity) {
    case "critical":
      return "border-neon-red text-neon-red";
    case "high":
      return "border-neon-amber text-neon-amber";
    case "medium":
      return "border-neon-cyan text-neon-cyan";
    case "low":
      return "border-neon-green text-neon-green";
    default: {
      const _exhaustive: never = severity;
      return String(_exhaustive);
    }
  }
}

export function FindingsTriageBoard() {
  const [findings, setFindings] = React.useState<Finding[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [movingId, setMovingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/findings");
      if (!res.ok) throw new Error("Failed to load findings");
      const json = (await res.json()) as { findings: Finding[] };
      setFindings(json.findings);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const move = async (finding: Finding, triageState: TriageState) => {
    setMovingId(finding.id);
    try {
      const res = await fetch(`/api/findings/${finding.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triageState }),
      });
      if (!res.ok) throw new Error("PATCH failed");
      const json = (await res.json()) as { finding: Finding };
      setFindings((prev) =>
        prev.map((f) => (f.id === finding.id ? json.finding : f))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Move failed");
    } finally {
      setMovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-4">
        {COLUMNS.map((c) => (
          <Skeleton key={c.id} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border border-line bg-console-rail px-3 py-2">
        <div className="flex items-center gap-3">
          <ConsoleLabel>FINDINGS TRIAGE</ConsoleLabel>
          <span className="font-mono text-xs text-muted-foreground">
            {findings.length} total
          </span>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="font-mono text-[10px] uppercase tracking-wider text-neon-cyan hover:underline"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="border border-neon-red/40 px-3 py-2 font-mono text-xs text-neon-red">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const cards = findings.filter((f) => f.triageState === col.id);
          return (
            <ConsolePanel
              key={col.id}
              label={col.label.toUpperCase()}
              headerRight={
                <span className="font-mono text-[10px] text-muted-foreground">
                  {cards.length}
                </span>
              }
              className="min-h-[280px]"
            >
              <div className="flex flex-col gap-2 p-2">
                {cards.length === 0 ? (
                  <p className="px-1 py-6 text-center font-mono text-[10px] uppercase text-muted-foreground">
                    Empty
                  </p>
                ) : (
                  cards.map((f) => {
                    const next = NEXT[f.triageState];
                    const prev = PREV[f.triageState];
                    return (
                      <div
                        key={f.id}
                        className="border border-line bg-console-rail p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[border-color,background-color,transform] duration-150 hover:border-neon-green/25 hover:bg-surface active:scale-[0.99]"
                      >
                        <div className="mb-1.5 flex items-start justify-between gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-mono text-[10px] uppercase",
                              severityClass(f.severity)
                            )}
                          >
                            {f.severity}
                          </Badge>
                          {f.vector ? (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {f.vector}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm leading-snug">{f.title}</p>
                        {f.engagementId ? (
                          <Link
                            href={`/engagements/${f.engagementId}`}
                            className="mt-1.5 inline-block font-mono text-[10px] text-neon-cyan transition-colors hover:text-neon-green"
                          >
                            Forensics →
                          </Link>
                        ) : null}
                        <div className="mt-2 flex gap-1">
                          {prev ? (
                            <button
                              type="button"
                              disabled={movingId === f.id}
                              onClick={() => void move(f, prev)}
                              className="border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase text-muted-foreground transition-[border-color,transform] duration-150 hover:border-neon-cyan active:scale-95 disabled:opacity-40"
                            >
                              ← {prev}
                            </button>
                          ) : null}
                          {next ? (
                            <button
                              type="button"
                              disabled={movingId === f.id}
                              onClick={() => void move(f, next)}
                              className="border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase text-neon-green transition-[border-color,transform] duration-150 hover:border-neon-green active:scale-95 disabled:opacity-40"
                            >
                              {next} →
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ConsolePanel>
          );
        })}
      </div>
    </div>
  );
}
