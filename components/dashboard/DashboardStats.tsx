"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { DashboardSummary } from "@/types/dashboard";
import { Activity, CheckCircle2, Clock, Layers } from "lucide-react";

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
  },
  {
    key: "completedSessions" as const,
    label: "Completed",
    icon: CheckCircle2,
    format: (s: DashboardStatsProps["summary"]) =>
      `${s.completedSessions} (${s.inProgressSessions} active)`,
  },
  {
    key: "avgPassRate" as const,
    label: "Avg Pass Rate",
    icon: Activity,
    format: (s: DashboardStatsProps["summary"]) =>
      `${Math.round(s.avgPassRate * 100)}%`,
  },
  {
    key: "avgSessionDurationMs" as const,
    label: "Avg Duration",
    icon: Clock,
    format: (s: DashboardStatsProps["summary"]) =>
      s.avgSessionDurationMs > 0
        ? `${Math.round(s.avgSessionDurationMs / 1000)}s`
        : "—",
  },
];

export function DashboardStats({ summary }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.key}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
                <Icon className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.format(summary)}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
