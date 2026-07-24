import type { ServerSession } from "@/lib/session/server-store";
import type {
  DashboardAlert,
  DashboardSummary,
  HeatmapCell,
  ProfileInsight,
  PromptAggregate,
  SessionListItem,
  TimelineEvent,
} from "@/types/dashboard";
import type { SessionExport } from "@/types/session";
import { LIVENESS_PROMPTS } from "@/lib/session/prompts";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getSessionStatus(session: ServerSession): SessionListItem["status"] {
  return session.export ? "completed" : "in_progress";
}

function computePassRate(exportData?: SessionExport): {
  passRate: number;
  passedCount: number;
  totalPrompts: number;
  avgConfidence: number;
} {
  if (!exportData || exportData.promptResults.length === 0) {
    return { passRate: 0, passedCount: 0, totalPrompts: 0, avgConfidence: 0 };
  }

  const passedCount = exportData.promptResults.filter((r) => r.passed).length;
  const totalPrompts = exportData.promptResults.length;
  const avgConfidence =
    exportData.promptResults.reduce((sum, r) => sum + r.confidence, 0) /
    totalPrompts;

  return {
    passRate: passedCount / totalPrompts,
    passedCount,
    totalPrompts,
    avgConfidence,
  };
}

function computeDurationMs(session: ServerSession): number | undefined {
  if (!session.export?.completedAt) return undefined;
  const start = new Date(session.createdAt).getTime();
  const end = new Date(session.export.completedAt).getTime();
  return Math.max(0, end - start);
}

export function toSessionListItem(session: ServerSession): SessionListItem {
  const { passRate, passedCount, totalPrompts, avgConfidence } = computePassRate(
    session.export
  );

  return {
    sessionId: session.sessionId,
    createdAt: session.createdAt,
    completedAt: session.completedAt,
    status: getSessionStatus(session),
    passRate,
    passedCount,
    totalPrompts,
    durationMs: computeDurationMs(session),
    avgConfidence,
  };
}

function buildHeatmap(sessions: ServerSession[]): HeatmapCell[] {
  const grid = new Map<string, { intensity: number; sessionCount: number }>();

  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      grid.set(`${day}-${hour}`, { intensity: 0, sessionCount: 0 });
    }
  }

  for (const session of sessions) {
    const date = new Date(session.createdAt);
    const day = date.getDay();
    const hour = date.getHours();
    const key = `${day}-${hour}`;
    const cell = grid.get(key)!;
    const eventCount = session.export?.events.length ?? 1;
    cell.intensity += eventCount;
    cell.sessionCount += 1;
  }

  const maxIntensity = Math.max(
    1,
    ...Array.from(grid.values()).map((c) => c.intensity)
  );

  return Array.from(grid.entries()).map(([key, value]) => {
    const [day, hour] = key.split("-").map(Number);
    return {
      day,
      hour,
      intensity: value.intensity / maxIntensity,
      sessionCount: value.sessionCount,
    };
  });
}

function buildPromptAggregates(sessions: ServerSession[]): PromptAggregate[] {
  const completed = sessions.filter((s) => s.export);
  const byPrompt = new Map<
    string,
    { passed: number; total: number; confidence: number; duration: number; attempts: number }
  >();

  for (const prompt of LIVENESS_PROMPTS) {
    byPrompt.set(prompt.id, {
      passed: 0,
      total: 0,
      confidence: 0,
      duration: 0,
      attempts: 0,
    });
  }

  for (const session of completed) {
    for (const result of session.export!.promptResults) {
      const agg = byPrompt.get(result.prompt);
      if (!agg) continue;
      agg.total += 1;
      if (result.passed) agg.passed += 1;
      agg.confidence += result.confidence;
      agg.duration += result.durationMs;
      agg.attempts += result.attempts;
    }
  }

  return LIVENESS_PROMPTS.map((prompt) => {
    const agg = byPrompt.get(prompt.id)!;
    return {
      prompt: prompt.id,
      passRate: agg.total > 0 ? agg.passed / agg.total : 0,
      avgConfidence: agg.total > 0 ? agg.confidence / agg.total : 0,
      avgDurationMs: agg.total > 0 ? agg.duration / agg.total : 0,
      totalAttempts: agg.attempts,
    };
  });
}

function buildAlerts(sessions: ServerSession[]): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  for (const session of sessions) {
    if (!session.export) continue;

    const failed = session.export.promptResults.filter((r) => !r.passed);
    for (const result of failed) {
      alerts.push({
        id: `${session.sessionId}-${result.prompt}-fail`,
        severity: "critical",
        title: "Prompt failed",
        message: `Session ${session.sessionId.slice(0, 8)}… failed "${result.prompt}" after ${result.attempts} attempt(s).`,
        sessionId: session.sessionId,
        timestamp: session.export.completedAt ?? session.createdAt,
      });
    }

    const lowConfidence = session.export.promptResults.filter(
      (r) => r.passed && r.confidence < 0.6
    );
    for (const result of lowConfidence) {
      alerts.push({
        id: `${session.sessionId}-${result.prompt}-low`,
        severity: "warning",
        title: "Low confidence pass",
        message: `"${result.prompt}" passed with ${Math.round(result.confidence * 100)}% confidence.`,
        sessionId: session.sessionId,
        timestamp: session.export.completedAt ?? session.createdAt,
      });
    }

    if (
      session.export.metrics.avgFps !== undefined &&
      session.export.metrics.avgFps < 15
    ) {
      alerts.push({
        id: `${session.sessionId}-fps`,
        severity: "warning",
        title: "Low frame rate",
        message: `Average FPS was ${session.export.metrics.avgFps.toFixed(1)} during capture.`,
        sessionId: session.sessionId,
        timestamp: session.export.completedAt ?? session.createdAt,
      });
    }

    const retries = session.export.events.filter((e) => e.type === "prompt_retry");
    if (retries.length >= 3) {
      alerts.push({
        id: `${session.sessionId}-retries`,
        severity: "info",
        title: "Multiple retries",
        message: `${retries.length} prompt retries recorded in this session.`,
        sessionId: session.sessionId,
        timestamp: session.export.completedAt ?? session.createdAt,
      });
    }

    const disconnects = session.export.events.filter(
      (e) => e.type === "device_disconnected"
    );
    if (disconnects.length > 0) {
      alerts.push({
        id: `${session.sessionId}-disconnect`,
        severity: "warning",
        title: "Companion disconnected",
        message: "Mobile companion disconnected during the session.",
        sessionId: session.sessionId,
        timestamp: session.export.completedAt ?? session.createdAt,
      });
    }

    const rejected = session.export.events.filter(
      (e) => e.type === "transform_rejected"
    );
    for (const event of rejected) {
      alerts.push({
        id: `${session.sessionId}-transform-${event.timestamp}`,
        severity: "info",
        title: "Transform rejected",
        message: "A document transform was declined by the user.",
        sessionId: session.sessionId,
        timestamp: event.timestamp,
      });
    }

    if (session.export.cameraFacing === "environment") {
      alerts.push({
        id: `${session.sessionId}-rear-cam`,
        severity: "info",
        title: "Rear camera used",
        message: "Session used the rear camera for companion capture.",
        sessionId: session.sessionId,
        timestamp: session.export.completedAt ?? session.createdAt,
      });
    }

    if (session.export.pairedDevice) {
      alerts.push({
        id: `${session.sessionId}-paired`,
        severity: "info",
        title: "Companion paired",
        message: `Android companion connected via ${session.export.pairedDevice.transport}.`,
        sessionId: session.sessionId,
        timestamp: session.export.pairedDevice.connectedAt,
      });
    }
  }

  return alerts.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

function buildProfileInsights(
  sessions: ServerSession[],
  promptAggregates: PromptAggregate[]
): ProfileInsight[] {
  const completed = sessions.filter((s) => s.export);
  if (completed.length === 0) {
    return [
      { label: "Sessions", value: "0", detail: "Complete a QA session to populate insights." },
    ];
  }

  const platforms = completed
    .map((s) => s.export?.device?.platform)
    .filter(Boolean) as string[];
  const platformCounts = platforms.reduce<Record<string, number>>((acc, p) => {
    acc[p] = (acc[p] ?? 0) + 1;
    return acc;
  }, {});
  const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0];

  const weakestPrompt = [...promptAggregates]
    .filter((p) => p.passRate < 1)
    .sort((a, b) => a.passRate - b.passRate)[0];

  const avgDuration =
    completed.reduce((sum, s) => sum + (computeDurationMs(s) ?? 0), 0) /
    completed.length;

  const totalBlinks = completed.reduce((sum, s) => {
    return (
      sum +
      (s.export?.events.filter((e) => e.type === "motion_detected").length ?? 0)
    );
  }, 0);

  const insights: ProfileInsight[] = [
    {
      label: "Completed sessions",
      value: String(completed.length),
      detail: `${sessions.length - completed.length} in progress`,
    },
    {
      label: "Avg session duration",
      value: `${Math.round(avgDuration / 1000)}s`,
    },
  ];

  if (topPlatform) {
    insights.push({
      label: "Primary platform",
      value: topPlatform[0],
      detail: `${topPlatform[1]} session(s)`,
    });
  }

  if (weakestPrompt) {
    insights.push({
      label: "Most retried prompt",
      value: weakestPrompt.prompt.replace(/_/g, " "),
      detail: `${Math.round(weakestPrompt.passRate * 100)}% pass rate`,
    });
  }

  insights.push({
    label: "Motion events captured",
    value: String(totalBlinks),
    detail: "Blink and head-turn detections across sessions",
  });

  return insights;
}

export function buildDashboardSummary(sessions: ServerSession[]): DashboardSummary {
  const sessionItems = sessions
    .map(toSessionListItem)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const completed = sessionItems.filter((s) => s.status === "completed");
  const inProgress = sessionItems.filter((s) => s.status === "in_progress");

  const avgPassRate =
    completed.length > 0
      ? completed.reduce((sum, s) => sum + s.passRate, 0) / completed.length
      : 0;

  const durations = completed
    .map((s) => s.durationMs)
    .filter((d): d is number => d !== undefined);
  const avgSessionDurationMs =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

  const promptAggregates = buildPromptAggregates(sessions);
  const alerts = buildAlerts(sessions);

  return {
    totalSessions: sessions.length,
    completedSessions: completed.length,
    inProgressSessions: inProgress.length,
    avgPassRate,
    avgSessionDurationMs,
    alerts,
    heatmap: buildHeatmap(sessions),
    promptAggregates,
    profileInsights: buildProfileInsights(sessions, promptAggregates),
    sessions: sessionItems,
  };
}

export function buildSessionTimeline(exportData: SessionExport): TimelineEvent[] {
  const eventLabels: Record<string, string> = {
    session_started: "Session started",
    prompt_shown: "Prompt shown",
    prompt_passed: "Prompt passed",
    prompt_failed: "Prompt failed",
    prompt_retry: "Prompt retry",
    motion_detected: "Motion detected",
    session_completed: "Session completed",
    device_paired: "Companion paired",
    device_disconnected: "Companion disconnected",
    camera_facing_changed: "Camera facing changed",
    transform_proposed: "Transform proposed",
    transform_applied: "Transform applied",
    transform_rejected: "Transform rejected",
  };

  return exportData.events.map((event, index) => {
    const prompt =
      typeof event.payload?.prompt === "string" ? event.payload.prompt : undefined;

    let label = eventLabels[event.type] ?? event.type;
    if (prompt) {
      label = `${label}: ${prompt.replace(/_/g, " ")}`;
    }

    return {
      id: `${event.type}-${index}`,
      type: event.type,
      timestamp: event.timestamp,
      label,
      payload: event.payload,
    };
  });
}

export function formatDayLabel(day: number): string {
  return DAY_LABELS[day] ?? String(day);
}

export function getSessionStatusColor(
  status: SessionListItem["status"],
  passRate: number
): "success" | "warning" | "destructive" | "secondary" {
  if (status === "in_progress") return "warning";
  if (passRate >= 1) return "success";
  if (passRate >= 0.5) return "warning";
  return "destructive";
}
