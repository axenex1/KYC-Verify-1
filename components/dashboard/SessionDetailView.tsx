"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventTimeline } from "@/components/dashboard/EventTimeline";
import { ProgressTracker } from "@/components/dashboard/ProgressTracker";
import { buildSessionTimeline } from "@/lib/dashboard/aggregations";
import type { SessionExport } from "@/types/session";
import { CheckCircle2, XCircle } from "lucide-react";

interface SessionDetailViewProps {
  sessionId: string;
}

export function SessionDetailView({ sessionId }: SessionDetailViewProps) {
  const [exportData, setExportData] = useState<SessionExport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/export`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Session not found or not yet completed.");
          } else {
            setError("Failed to load session.");
          }
          return;
        }
        const data = (await response.json()) as SessionExport;
        setExportData(data);
      } catch {
        setError("Failed to load session.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [sessionId]);

  const handleDownload = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `kyc-qa-session-${sessionId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-zinc-500">
        Loading session...
      </div>
    );
  }

  if (error || !exportData) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {error ?? "Session data unavailable."}
        </div>
      </div>
    );
  }

  const passedCount = exportData.promptResults.filter((r) => r.passed).length;
  const passRate = passedCount / exportData.promptResults.length;
  const events = buildSessionTimeline(exportData);

  const promptAggregates = exportData.promptResults.map((r) => ({
    prompt: r.prompt,
    passRate: r.passed ? 1 : 0,
    avgConfidence: r.confidence,
    avgDurationMs: r.durationMs,
    totalAttempts: r.attempts,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4" />
          Download JSON
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle>Session Detail</CardTitle>
            <Badge variant={passRate >= 1 ? "success" : passRate >= 0.5 ? "warning" : "destructive"}>
              {Math.round(passRate * 100)}% pass rate
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <p className="text-zinc-500">Session ID</p>
            <code className="text-xs">{exportData.sessionId}</code>
          </div>
          <div>
            <p className="text-zinc-500">Started</p>
            <p>{new Date(exportData.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-zinc-500">Completed</p>
            <p>
              {exportData.completedAt
                ? new Date(exportData.completedAt).toLocaleString()
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-zinc-500">Platform</p>
            <p>{exportData.device?.platform ?? "Unknown"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prompt Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {exportData.promptResults.map((result) => (
            <div
              key={result.prompt}
              className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
            >
              <span className="text-sm font-medium capitalize">
                {result.prompt.replace(/_/g, " ")}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant={result.passed ? "success" : "destructive"}>
                  {result.passed ? "Pass" : "Fail"}
                </Badge>
                <span className="text-xs text-zinc-500">
                  {Math.round(result.confidence * 100)}% · {result.attempts} attempt(s)
                </span>
                {result.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProgressTracker aggregates={promptAggregates} />
        <EventTimeline events={events} />
      </div>

      {(exportData.pairedDevice || exportData.documentQA) && (
        <Card>
          <CardHeader>
            <CardTitle>Companion & Document QA</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            {exportData.pairedDevice && (
              <>
                <div>
                  <p className="text-zinc-500">Paired device</p>
                  <p className="font-semibold capitalize">
                    {exportData.pairedDevice.platform} ({exportData.pairedDevice.transport})
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500">Connected at</p>
                  <p>
                    {new Date(exportData.pairedDevice.connectedAt).toLocaleString()}
                  </p>
                </div>
              </>
            )}
            {exportData.documentQA?.templateId && (
              <div>
                <p className="text-zinc-500">Document template</p>
                <p className="font-semibold">{exportData.documentQA.templateId}</p>
              </div>
            )}
            {exportData.documentQA?.appliedTransform && (
              <div>
                <p className="text-zinc-500">Applied transform</p>
                <p className="text-xs font-mono">
                  scale {exportData.documentQA.appliedTransform.scale} · rot{" "}
                  {exportData.documentQA.appliedTransform.rotationDeg}°
                </p>
              </div>
            )}
            {exportData.cameraFacing && (
              <div>
                <p className="text-zinc-500">Camera facing</p>
                <p className="font-semibold">{exportData.cameraFacing}</p>
              </div>
            )}
            {exportData.pairedDevice?.disconnectedAt && (
              <div>
                <p className="text-zinc-500">Disconnected at</p>
                <p>
                  {new Date(exportData.pairedDevice.disconnectedAt).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {exportData.events.some((e) =>
        [
          "transform_proposed",
          "transform_applied",
          "transform_rejected",
          "device_paired",
          "device_disconnected",
          "camera_facing_changed",
        ].includes(e.type)
      ) && (
        <Card>
          <CardHeader>
            <CardTitle>Companion & Transform History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {exportData.events
              .filter((e) =>
                [
                  "transform_proposed",
                  "transform_applied",
                  "transform_rejected",
                  "device_paired",
                  "device_disconnected",
                  "camera_facing_changed",
                ].includes(e.type)
              )
              .map((event, index) => (
                <div
                  key={`${event.type}-${event.timestamp}-${index}`}
                  className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-2 last:border-0 dark:border-zinc-800"
                >
                  <span className="font-medium capitalize">
                    {event.type.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {exportData.metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Capture Metrics</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-zinc-500">Avg FPS</p>
              <p className="font-semibold">
                {exportData.metrics.avgFps?.toFixed(1) ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Max head rotation</p>
              <p className="font-semibold">
                {exportData.metrics.headRotationMaxDeg?.toFixed(0) ?? "—"}°
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Avg blink interval</p>
              <p className="font-semibold">
                {exportData.metrics.avgBlinkIntervalMs
                  ? `${Math.round(exportData.metrics.avgBlinkIntervalMs)}ms`
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
