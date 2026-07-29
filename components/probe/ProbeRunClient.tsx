"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Download,
  FileWarning,
  Play,
  Smartphone,
  Crosshair,
} from "lucide-react";
import { ConsolePanel } from "@/components/ui/console-panel";
import { ConsoleLabel } from "@/components/ui/console-label";
import { SignalTerminal } from "@/components/ui/signal-terminal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientAuditLogger } from "@/lib/audit/logger";
import { listVectors, createVector } from "@/lib/vectors/registry";
import {
  extractFindings,
  toCreateFindingInput,
} from "@/lib/findings/extract";
import {
  downloadTextFile,
  generateMarkdownReport,
} from "@/lib/findings/report";
import { simulateTargetVerdict } from "@/lib/targets/simulate-verdict";
import type { Engagement, Run, TargetVerdict, VectorPayload } from "@/types/engagement";
import type { Finding } from "@/types/findings";
import type { Target } from "@/types/targets";
import type { SessionExport } from "@/types/session";
import { cn } from "@/lib/utils";

const LivenessPromptController = dynamic(
  () =>
    import("@/components/liveness/LivenessPromptController").then(
      (m) => m.LivenessPromptController
    ),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3 p-3" aria-busy="true">
        <Skeleton className="aspect-video w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    ),
  }
);

type CaptureMode = "local" | "companion";

interface ProbeRunClientProps {
  engagementId: string;
  /** When set, resume/focus this run id (pinned probe route). */
  initialRunId?: string;
}

function formatSignalLine(
  type: string,
  payload?: Record<string, unknown>
): string {
  const ts = new Date().toISOString().slice(11, 19);
  const detail = payload ? ` ${JSON.stringify(payload)}` : "";
  return `[${ts}] ${type}${detail}`;
}

export function ProbeRunClient({
  engagementId,
  initialRunId,
}: ProbeRunClientProps) {
  const auditLogger = React.useMemo(() => new ClientAuditLogger(), []);
  const [engagement, setEngagement] = React.useState<Engagement | null>(null);
  const [target, setTarget] = React.useState<Target | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [activeVector, setActiveVector] = React.useState<VectorPayload | null>(
    null
  );
  const [captureMode, setCaptureMode] = React.useState<CaptureMode>("local");
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [run, setRun] = React.useState<Run | null>(null);
  const [running, setRunning] = React.useState(false);
  const [signalLines, setSignalLines] = React.useState<string[]>([
    initialRunId
      ? `probe console · pinned run ${initialRunId.slice(0, 8)}`
      : "probe console idle - select vector and arm run",
  ]);
  const [appendLine, setAppendLine] = React.useState<string | null>(null);
  const [verdict, setVerdict] = React.useState<TargetVerdict | null>(null);
  const [sessionExport, setSessionExport] = React.useState<SessionExport | null>(
    null
  );
  const [filedFindings, setFiledFindings] = React.useState<Finding[]>([]);
  const [busy, setBusy] = React.useState(false);

  const catalog = React.useMemo(() => listVectors(), []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const engRes = await fetch(`/api/engagements/${engagementId}`);
        if (!engRes.ok) throw new Error("Engagement not found");
        const engJson = (await engRes.json()) as { engagement: Engagement };
        if (cancelled) return;
        setEngagement(engJson.engagement);

        const configured = engJson.engagement.vectorPayloads;
        setActiveVector(
          configured[0] ?? {
            kind: "deepfake",
            label: "Deepfake Injection",
            config: {},
          }
        );

        const tgtRes = await fetch(
          `/api/targets/${engJson.engagement.targetId}`
        );
        if (tgtRes.ok) {
          const tgtJson = (await tgtRes.json()) as { target: Target };
          if (!cancelled) setTarget(tgtJson.target);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [engagementId]);

  React.useEffect(() => {
    return auditLogger.subscribe((event) => {
      const line = formatSignalLine(event.type, event.payload);
      setAppendLine(line);
    });
  }, [auditLogger]);

  const pushLine = React.useCallback((line: string) => {
    setAppendLine(line);
  }, []);

  const armAndStart = React.useCallback(async () => {
    if (!engagement || !activeVector || running) return;
    setBusy(true);
    setFiledFindings([]);
    setVerdict(null);
    setSessionExport(null);
    auditLogger.clear();
    setSignalLines(["arming probe run…"]);

    try {
      const vector = createVector(activeVector.kind);
      const payload = await vector.configure(activeVector.config ?? {});
      setActiveVector(payload);
      pushLine(formatSignalLine("vector_configured", { kind: payload.kind }));

      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "qa",
          engagementId: engagement.id,
          targetId: engagement.targetId,
        }),
      });
      if (!sessionRes.ok) throw new Error("Failed to mint session");
      const sessionJson = (await sessionRes.json()) as { sessionId: string };

      const runRes = await fetch(`/api/engagements/${engagement.id}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionJson.sessionId,
          vectorPayload: payload,
        }),
      });
      if (!runRes.ok) throw new Error("Failed to create run");
      const runJson = (await runRes.json()) as { run: Run };

      await fetch(`/api/engagements/${engagement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });

      setSessionId(sessionJson.sessionId);
      setRun(runJson.run);
      setRunning(true);
      auditLogger.log("probe_armed", {
        sessionId: sessionJson.sessionId,
        runId: runJson.run.id,
        vector: payload.kind,
        mode: captureMode,
      });
      pushLine(
        formatSignalLine("probe_armed", {
          sessionId: sessionJson.sessionId,
          vector: payload.kind,
        })
      );
    } catch (e) {
      pushLine(
        formatSignalLine("error", {
          message: e instanceof Error ? e.message : "arm failed",
        })
      );
    } finally {
      setBusy(false);
    }
  }, [
    engagement,
    activeVector,
    running,
    auditLogger,
    pushLine,
    captureMode,
  ]);

  const finalizeRun = React.useCallback(
    async (exportData: SessionExport) => {
      if (!engagement || !activeVector || !target || !run) return;
      setBusy(true);

      try {
        const targetVerdict = simulateTargetVerdict({
          adapterType: target.adapterType,
          vector: activeVector,
          vendor: target.vendor,
        });
        setVerdict(targetVerdict);
        pushLine(
          formatSignalLine("target_verdict", {
            outcome: targetVerdict.outcome,
            confidence: targetVerdict.confidence,
          })
        );

        const enriched: SessionExport = {
          ...exportData,
          target: {
            id: target.id,
            vendor: target.vendor,
            name: target.name,
          },
          vectorPayload: activeVector,
          targetVerdict,
        };
        setSessionExport(enriched);

        await fetch(`/api/sessions/${exportData.sessionId}/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(enriched),
        });

        await fetch(`/api/runs/${run.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "completed",
            targetVerdict,
            vectorPayload: activeVector,
            completedAt: new Date().toISOString(),
          }),
        });

        const drafts = extractFindings({
          id: run.id,
          engagementId: engagement.id,
          targetId: target.id,
          vectorPayload: activeVector,
          targetVerdict,
          sessionExport: enriched,
        });

        const created: Finding[] = [];
        for (const draft of drafts) {
          const res = await fetch("/api/findings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(toCreateFindingInput(draft)),
          });
          if (res.ok) {
            const json = (await res.json()) as { finding: Finding };
            created.push(json.finding);
            pushLine(
              formatSignalLine("finding_filed", {
                id: json.finding.id,
                severity: json.finding.severity,
              })
            );
          }
        }
        setFiledFindings(created);

        const withFindings: SessionExport = {
          ...enriched,
          findings: created.map((f) => ({
            id: f.id,
            title: f.title,
            severity: f.severity,
            triageState: f.triageState,
          })),
        };
        setSessionExport(withFindings);

        await fetch(`/api/sessions/${exportData.sessionId}/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(withFindings),
        });

        setRunning(false);
        pushLine(formatSignalLine("probe_complete", { findings: created.length }));
      } catch (e) {
        pushLine(
          formatSignalLine("error", {
            message: e instanceof Error ? e.message : "finalize failed",
          })
        );
      } finally {
        setBusy(false);
      }
    },
    [engagement, activeVector, target, run, pushLine]
  );

  const exportAuditJson = () => {
    if (!sessionExport) return;
    downloadTextFile(
      `probe-audit-${sessionExport.sessionId}.json`,
      JSON.stringify(sessionExport, null, 2),
      "application/json"
    );
  };

  const exportMarkdown = () => {
    if (!engagement) return;
    const md = generateMarkdownReport({
      engagement,
      target,
      findings: filedFindings,
      sessionExport,
      runId: run?.id,
      vectorPayload: activeVector,
      targetVerdict: verdict,
    });
    downloadTextFile(
      `pentest-report-${engagement.id}.md`,
      md,
      "text/markdown"
    );
  };

  if (loadError) {
    return (
      <div className="border border-neon-red/40 bg-surface p-6 font-mono text-sm text-neon-red">
        {loadError}
      </div>
    );
  }

  if (!engagement) {
    return (
      <div className="space-y-3 p-4" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const configuredKinds = new Set(
    engagement.vectorPayloads.map((v) => v.kind)
  );
  const vectorOptions =
    engagement.vectorPayloads.length > 0
      ? engagement.vectorPayloads
      : catalog.map((v) => ({
          kind: v.kind,
          label: v.label,
          config: {},
        }));

  return (
    <div className="flex h-full min-h-[calc(100vh-8rem)] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border border-line bg-console-rail px-3 py-2">
        <div className="flex items-center gap-3">
          <ConsoleLabel>LIVE PROBE</ConsoleLabel>
          <span className="font-mono text-xs text-muted-foreground">
            {engagement.name ?? engagement.id}
          </span>
          {target ? (
            <Badge variant="outline" className="font-mono text-[10px]">
              {target.name}
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/engagements/${engagement.id}`}
            className="font-mono text-[10px] uppercase tracking-wider text-neon-cyan hover:underline"
          >
            Forensics →
          </Link>
          <Link
            href="/findings"
            className="font-mono text-[10px] uppercase tracking-wider text-neon-amber hover:underline"
          >
            Triage →
          </Link>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
        {/* Left: vector controls */}
        <ConsolePanel label="VECTOR" className="min-h-[280px]">
          <div className="flex flex-col gap-3 p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Payload
            </p>
            <div className="flex flex-col gap-1.5">
              {vectorOptions.map((v) => {
                const selected = activeVector?.kind === v.kind;
                const inEngagement =
                  configuredKinds.size === 0 || configuredKinds.has(v.kind);
                return (
                  <button
                    key={v.kind}
                    type="button"
                    disabled={running || !inEngagement}
                    onClick={() =>
                      setActiveVector({
                        kind: v.kind,
                        label: v.label,
                        config: v.config ?? {},
                      })
                    }
                    className={cn(
                      "border px-2 py-2 text-left font-mono text-xs transition-colors",
                      selected
                        ? "border-neon-green bg-neon-green/10 text-neon-green"
                        : "border-line text-muted-foreground hover:border-neon-cyan/50 hover:text-foreground",
                      !inEngagement && "opacity-40"
                    )}
                  >
                    <span className="block uppercase tracking-wider">
                      {v.kind}
                    </span>
                    <span className="text-[10px] opacity-70">
                      {v.label ?? catalog.find((c) => c.kind === v.kind)?.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-line pt-3">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Capture mode
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={running}
                  onClick={() => setCaptureMode("local")}
                  className={cn(
                    "border px-2 py-1.5 font-mono text-[10px] uppercase",
                    captureMode === "local"
                      ? "border-neon-cyan text-neon-cyan"
                      : "border-line text-muted-foreground"
                  )}
                >
                  Local cam
                </button>
                <button
                  type="button"
                  disabled={running}
                  onClick={() => setCaptureMode("companion")}
                  className={cn(
                    "border px-2 py-1.5 font-mono text-[10px] uppercase",
                    captureMode === "companion"
                      ? "border-neon-cyan text-neon-cyan"
                      : "border-line text-muted-foreground"
                  )}
                >
                  Phone
                </button>
              </div>
            </div>

            <Button
              variant="console"
              className="mt-auto w-full gap-2 text-xs uppercase"
              disabled={busy || running || !activeVector}
              onClick={() => void armAndStart()}
            >
              <Play className="h-3.5 w-3.5" />
              {running ? "Probe armed" : "Arm & start"}
            </Button>

            {captureMode === "companion" ? (
              <Link
                href={`/engagements/${engagementId}/pair`}
                className="flex items-center justify-center gap-1.5 border border-line px-2 py-2 font-mono text-[10px] uppercase text-neon-cyan hover:bg-neon-cyan/5"
              >
                <Smartphone className="h-3.5 w-3.5" />
                Open companion pair
              </Link>
            ) : null}

            {verdict ? (
              <div className="border border-line bg-console-rail p-2 font-mono text-[11px]">
                <ConsoleLabel className="mb-1 block">VERDICT</ConsoleLabel>
                <p
                  className={cn(
                    "uppercase",
                    verdict.outcome === "pass"
                      ? "text-neon-red"
                      : verdict.outcome === "fail"
                        ? "text-neon-green"
                        : "text-neon-amber"
                  )}
                >
                  {verdict.outcome}
                  {verdict.confidence != null
                    ? ` · ${Math.round(verdict.confidence * 100)}%`
                    : ""}
                </p>
              </div>
            ) : null}

            {sessionExport ? (
              <div className="flex flex-col gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 font-mono text-[10px]"
                  onClick={exportAuditJson}
                >
                  <Download className="h-3 w-3" />
                  Audit JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 font-mono text-[10px]"
                  onClick={exportMarkdown}
                >
                  <FileWarning className="h-3 w-3" />
                  MD report
                </Button>
              </div>
            ) : null}
          </div>
        </ConsolePanel>

        {/* Center: capture */}
        <ConsolePanel
          label="CAPTURE"
          headerRight={
            <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
              <Crosshair className="h-3 w-3" />
              {activeVector?.kind ?? "-"}
            </span>
          }
          className="min-h-[320px] overflow-hidden"
        >
          <div className="h-full overflow-y-auto p-3">
            {!sessionId ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 border border-dashed border-line text-center">
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Awaiting arm
                </p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Select a vector payload and start the probe to open the
                  MediaPipe capture stack with injection hooks.
                </p>
              </div>
            ) : captureMode === "companion" ? (
              <div className="space-y-3">
                <div className="border border-neon-cyan/30 bg-neon-cyan/5 p-3 font-mono text-xs text-neon-cyan">
                  Companion phone mode - open the controller link on the paired
                  device. Local capture remains available below as fallback.
                </div>
                <LivenessPromptController
                  sessionId={sessionId}
                  auditLogger={auditLogger}
                  hideCompletionCard
                  onComplete={(data) => void finalizeRun(data)}
                />
              </div>
            ) : (
              <LivenessPromptController
                sessionId={sessionId}
                auditLogger={auditLogger}
                hideCompletionCard
                onComplete={(data) => void finalizeRun(data)}
              />
            )}

            {filedFindings.length > 0 ? (
              <div className="mt-3 border border-neon-red/40 bg-neon-red/5 p-3">
                <ConsoleLabel className="mb-2 block">
                  FINDINGS FILED
                </ConsoleLabel>
                <ul className="space-y-1 font-mono text-xs">
                  {filedFindings.map((f) => (
                    <li key={f.id} className="flex justify-between gap-2">
                      <span className="text-neon-red">{f.severity}</span>
                      <span className="truncate text-muted-foreground">
                        {f.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </ConsolePanel>

        {/* Right: signal terminal */}
        <div className="min-h-[240px] lg:min-h-0">
          <SignalTerminal
            lines={signalLines}
            appendLine={appendLine}
            label="SIGNAL / VERDICT"
            className="h-full min-h-[240px]"
          />
        </div>
      </div>
    </div>
  );
}
