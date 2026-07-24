"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { SessionTimeline } from "@/components/dashboard/SessionTimeline";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { ProgressTracker } from "@/components/dashboard/ProgressTracker";
import { ProfileSummary } from "@/components/dashboard/ProfileSummary";
import { NotificationsPanel } from "@/components/dashboard/NotificationsPanel";
import type { DashboardSummary } from "@/types/dashboard";

export function DashboardView() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSummary = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard/summary");
      if (!response.ok) throw new Error("Failed to load dashboard");
      const data = (await response.json()) as DashboardSummary;
      setSummary(data);
    } catch {
      setError("Could not load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function fetchSummary() {
      try {
        const response = await fetch("/api/dashboard/summary");
        if (!response.ok) throw new Error("Failed to load dashboard");
        const data = (await response.json()) as DashboardSummary;
        if (!cancelled) setSummary(data);
      } catch {
        if (!cancelled) setError("Could not load dashboard data.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading && !summary) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-zinc-500">
        Loading dashboard...
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
        {error}
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          Monitoring QA liveness sessions on this server instance
        </p>
        <Button variant="outline" size="sm" onClick={() => loadSummary()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <DashboardStats summary={summary} />

      <div className="grid gap-6 lg:grid-cols-2">
        <SessionTimeline sessions={summary.sessions} />
        <NotificationsPanel alerts={summary.alerts} />
      </div>

      <ActivityHeatmap cells={summary.heatmap} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ProgressTracker aggregates={summary.promptAggregates} />
        <ProfileSummary insights={summary.profileInsights} />
      </div>
    </div>
  );
}
