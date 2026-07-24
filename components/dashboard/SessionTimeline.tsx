"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionListItem } from "@/types/dashboard";
import { getSessionStatusColor } from "@/lib/dashboard/aggregations";
import { Clock, ChevronRight } from "lucide-react";

interface SessionTimelineProps {
  sessions: SessionListItem[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms?: number): string {
  if (!ms) return "—";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function SessionTimeline({ sessions }: SessionTimelineProps) {
  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">
            No sessions yet. Complete a QA capture session to see it here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sessions.map((session) => {
          const variant = getSessionStatusColor(session.status, session.passRate);
          return (
            <Link
              key={session.sessionId}
              href={`/dashboard/${session.sessionId}`}
              className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <code className="truncate text-xs font-mono text-zinc-600 dark:text-zinc-400">
                    {session.sessionId.slice(0, 8)}…
                  </code>
                  <Badge variant={variant}>
                    {session.status === "in_progress"
                      ? "In progress"
                      : session.passRate >= 1
                        ? "Complete"
                        : "Needs review"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {formatDate(session.createdAt)}
                  {session.completedAt && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(session.durationMs)}
                    </span>
                  )}
                </p>
                {session.status === "completed" && (
                  <p className="mt-1 text-xs text-zinc-500">
                    {session.passedCount}/{session.totalPrompts} prompts passed ·{" "}
                    {Math.round(session.avgConfidence * 100)}% avg confidence
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
