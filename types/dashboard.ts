export type SessionListStatus = "completed" | "in_progress";

export interface SessionListItem {
  sessionId: string;
  createdAt: string;
  completedAt?: string;
  status: SessionListStatus;
  passRate: number;
  passedCount: number;
  totalPrompts: number;
  durationMs?: number;
  avgConfidence: number;
}

export type AlertSeverity = "info" | "warning" | "critical";

export interface DashboardAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  sessionId?: string;
  timestamp: string;
}

export interface HeatmapCell {
  day: number;
  hour: number;
  intensity: number;
  sessionCount: number;
}

export interface PromptAggregate {
  prompt: string;
  passRate: number;
  avgConfidence: number;
  avgDurationMs: number;
  totalAttempts: number;
}

export interface ProfileInsight {
  label: string;
  value: string;
  detail?: string;
}

export interface DashboardSummary {
  totalSessions: number;
  completedSessions: number;
  inProgressSessions: number;
  avgPassRate: number;
  avgSessionDurationMs: number;
  alerts: DashboardAlert[];
  heatmap: HeatmapCell[];
  promptAggregates: PromptAggregate[];
  profileInsights: ProfileInsight[];
  sessions: SessionListItem[];
}

export interface TimelineEvent {
  id: string;
  type: string;
  timestamp: string;
  label: string;
  payload?: Record<string, unknown>;
}
