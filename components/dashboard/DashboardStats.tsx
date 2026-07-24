"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { DashboardSummary } from "@/types/dashboard";
import { Activity, CheckCircle2, Clock, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardStatsProps {
  summary: Pick<
    DashboardSummary,
    | "totalSessions"
    | "completedSessions"
    | "inProgressSessions"
    | "avgPassRate"
    | "avgSessionDurationMs"
  >;
}

const stats = [
  {
    key: "totalSessions" as const,
    label: "Total Sessions",
    icon: Layers,
    format: (s: DashboardStatsProps["summary"]) => String(s.totalSessions),
    accent: "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20",
  },
  {
    key: "completedSessions" as const,
    label: "Completed",
    icon: CheckCircle2,
    format: (s: DashboardStatsProps["summary"]) =>
      `${s.completedSessions} (${s.inProgressSessions} active)`,
    accent:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
  },
  {
    key: "avgPassRate" as const,
    label: "Avg Pass Rate",
    icon: Activity,
    format: (s: DashboardStatsProps["summary"]) =>
      `${Math.round(s.avgPassRate * 100)}%`,
    accent:
      "bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-violet-500/20",
  },
  {
    key: "avgSessionDurationMs" as const,
    label: "Avg Duration",
    icon: Clock,
    format: (s: DashboardStatsProps["summary"]) =>
      s.avgSessionDurationMs > 0
        ? `${Math.round(s.avgSessionDurationMs / 1000)}s`
        : "—",
    accent:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20",
  },
];

export function DashboardStats({ summary }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.key}
            className="overflow-hidden border-zinc-200/60 transition-all hover:shadow-md dark:border-zinc-800/60"
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1",
                  stat.accent
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-0.5 truncate text-xl font-bold tracking-tight">
                  {stat.format(summary)}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
