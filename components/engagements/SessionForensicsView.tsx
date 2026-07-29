"use client";

import * as React from "react";
import Link from "next/link";
import { Download, Play } from "lucide-react";
import { ConsolePanel } from "@/components/ui/console-panel";
import { ConsoleLabel } from "@/components/ui/console-label";
import { SignalTerminal } from "@/components/ui/signal-terminal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadTextFile } from "@/lib/findings/report";
import type { Engagement, Run, TargetVerdict } from "@/types/engagement";
import type { Finding } from "@/types/findings";
import type { Target } from "@/types/targets";
import type { SessionExport } from "@/types/session";
import { cn } from "@/lib/utils";

interface ForensicsPayload {
  engagement: Engagement;
  target: Target | null;
  findings: Finding[];
  runs: Run[];
  sessions: Array<{
    sessionId: string;
    createdAt: string;
    completedAt?: string;
    export?: SessionExport;
  }>;
  reportMarkdown: string;
}

interface SessionForensicsViewProps {
  engagementId: string;
  /** Optional: focus a specific run in the forensics view. */
  runId?: string;
}

function severityClass(severity: Finding["severity"]): string {
  switch (severity) {
    case "critical":
      return "text-neon-red";
    case "high":
      return "text-neon-amber";
    case "medium":
      return "text-neon-cyan";
    case "low":
      return "text-neon-green";
    default: {
      const _exhaustive: never = severity;
      return String(_exhaustive);
    }
  }
}

export function SessionForensicsView({
  engagementId,
  runId,
}: SessionForensicsViewProps) {
  const [data, setData] = React.useState<ForensicsPayload | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/engagements/${engagementId}/forensics`);
        if (!res.ok) throw new Error("Engagement forensics unavailable");
        const json = (await res.json()) as ForensicsPayload;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Load failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [engagementId]);

  if (error) {
    return (
      <div className="border border-neon-red/40 p-4 font-mono text-sm text-neon-red">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const { engagement, target, findings, runs, sessions, reportMarkdown } = data;
  const latestSession = sessions.find((s) => s.export)?.export ?? null;
  const latestRun =
    (runId ? runs.find((r) => r.id === runId) : null) ?? runs[0] ?? null;
  const intent =
    latestRun?.vectorPayload ??
    latestSession?.vectorPayload ??
    engagement.vectorPayloads[0] ??
    null;
  const verdict: TargetVerdict | null =
    latestRun?.targetVerdict ?? latestSession?.targetVerdict ?? null;

  const timelineLines =
    latestSession?.events?.map((ev) => {
      const t = ev.timestamp.slice(11, 19);
      return `[${t}] ${ev.type}${
        ev.payload ? ` ${JSON.stringify(ev.payload)}` : ""
      }`;
    }) ?? ["no audit events recorded for this engagement"];

  const signalLines: string[] = [];
  if (intent) {
    signalLines.push(
      `intent: ${intent.kind}${intent.label ? ` (${intent.label})` : ""}`
    );
  }
  if (verdict) {
    signalLines.push(
      `verdict: ${verdict.outcome} conf=${
        verdict.confidence != null
          ? `${Math.round(verdict.confidence * 100)}%`
          : "n/a"
      }`
    );
    if (verdict.signals) {
      signalLines.push(`signals: ${JSON.stringify(verdict.signals)}`);
    }
  }
  if (signalLines.length === 0) {
    signalLines.push("no probe run data yet");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border border-line bg-console-rail px-3 py-2">
        <div className="flex flex-wrap items-center gap-3">
          <ConsoleLabel>SESSION FORENSICS</ConsoleLabel>
          <span className="font-mono text-xs">
            {engagement.name ?? engagement.id}
          </span>
          <Badge variant="outline" className="font-mono text-[10px]">
            {engagement.status}
          </Badge>
          {target ? (
            <span className="font-mono text-[10px] text-muted-foreground">
              target · {target.name}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="console" className="gap-1.5 text-[10px]">
            <Link href={`/engagements/${engagement.id}/probe`}>
              <Play className="h-3 w-3" />
              Probe
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 font-mono text-[10px]"
            onClick={() =>
              downloadTextFile(
                `pentest-report-${engagement.id}.md`,
                reportMarkdown
              )
            }
          >
            <Download className="h-3 w-3" />
            MD report
          </Button>
          {latestSession ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 font-mono text-[10px]"
              onClick={() =>
                downloadTextFile(
                  `audit-${latestSession.sessionId}.json`,
                  JSON.stringify(latestSession, null, 2),
                  "application/json"
                )
              }
            >
              <Download className="h-3 w-3" />
              Audit JSON
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ConsolePanel label="ATTACKER INTENT">
          <div className="space-y-2 p-3 font-mono text-xs">
            <p>
              <span className="text-muted-foreground">Vector:</span>{" "}
              <span className="text-neon-amber">
                {intent?.kind ?? "-"}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Label:</span>{" "}
              {intent?.label ?? "-"}
            </p>
            <pre className="overflow-x-auto border border-line bg-console-rail p-2 text-[10px] text-muted-foreground">
              {JSON.stringify(intent?.config ?? {}, null, 2)}
            </pre>
          </div>
        </ConsolePanel>

        <ConsolePanel label="TARGET VERDICT">
          <div className="space-y-2 p-3 font-mono text-xs">
            <p>
              <span className="text-muted-foreground">Outcome:</span>{" "}
              <span
                className={cn(
                  "uppercase",
                  verdict?.outcome === "pass"
                    ? "text-neon-red"
                    : verdict?.outcome === "fail"
                      ? "text-neon-green"
                      : "text-neon-amber"
                )}
              >
                {verdict?.outcome ?? "-"}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Confidence:</span>{" "}
              {verdict?.confidence != null
                ? `${Math.round(verdict.confidence * 100)}%`
                : "-"}
            </p>
            <pre className="overflow-x-auto border border-line bg-console-rail p-2 text-[10px] text-muted-foreground">
              {JSON.stringify(verdict?.signals ?? {}, null, 2)}
            </pre>
          </div>
        </ConsolePanel>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <ConsolePanel label="EVENT TIMELINE">
          <div className="max-h-[360px] overflow-y-auto p-3">
            {latestSession?.events?.length ? (
              <ol className="relative space-y-3 border-l border-line pl-4">
                {latestSession.events.map((ev, i) => (
                  <li key={`${ev.timestamp}-${ev.type}-${i}`} className="relative">
                    <span className="absolute -left-[1.15rem] top-1.5 h-2 w-2 rounded-full bg-neon-cyan" />
                    <p className="font-mono text-xs font-medium">{ev.type}</p>
                    <time className="font-mono text-[10px] text-muted-foreground">
                      {ev.timestamp}
                    </time>
                    {ev.payload ? (
                      <pre className="mt-1 overflow-x-auto text-[10px] text-muted-foreground">
                        {JSON.stringify(ev.payload)}
                      </pre>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="font-mono text-xs text-muted-foreground">
                No events - run a probe first.
              </p>
            )}
          </div>
        </ConsolePanel>

        <SignalTerminal
          lines={[...signalLines, "---", ...timelineLines.slice(-40)]}
          label="SIGNAL TRACE"
          className="min-h-[280px]"
        />
      </div>

      <ConsolePanel
        label="FINDINGS"
        headerRight={
          <Link
            href="/findings"
            className="font-mono text-[10px] uppercase text-neon-cyan hover:underline"
          >
            Triage board →
          </Link>
        }
      >
        <div className="divide-y divide-line">
          {findings.length === 0 ? (
            <p className="p-4 font-mono text-xs text-muted-foreground">
              No findings filed for this engagement.
            </p>
          ) : (
            findings.map((f) => (
              <div
                key={f.id}
                className="flex flex-wrap items-start justify-between gap-2 px-3 py-2"
              >
                <div>
                  <p className="text-sm">{f.title}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {f.vector ?? "-"} · {f.triageState}
                  </p>
                </div>
                <span
                  className={cn(
                    "font-mono text-[10px] uppercase",
                    severityClass(f.severity)
                  )}
                >
                  {f.severity}
                </span>
              </div>
            ))
          )}
        </div>
      </ConsolePanel>

      <ConsolePanel label="RUNS">
        <div className="divide-y divide-line font-mono text-xs">
          {runs.length === 0 ? (
            <p className="p-4 text-muted-foreground">No runs recorded.</p>
          ) : (
            runs.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap justify-between gap-2 px-3 py-2"
              >
                <span className="text-muted-foreground">{r.id.slice(0, 8)}…</span>
                <span>{r.status}</span>
                <span>{r.vectorPayload?.kind ?? "-"}</span>
                <span>{r.targetVerdict?.outcome ?? "-"}</span>
                <span className="text-muted-foreground">
                  {new Date(r.startedAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </ConsolePanel>
    </div>
  );
}
