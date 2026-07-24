"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProfileInsight } from "@/types/dashboard";

interface ProfileSummaryProps {
  insights: ProfileInsight[];
}

export function ProfileSummary({ insights }: ProfileSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>QA Profile Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-zinc-500">
          Aggregated interaction patterns across all sessions on this server
        </p>
        <dl className="space-y-4">
          {insights.map((insight) => (
            <div
              key={insight.label}
              className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-3 last:border-0 dark:border-zinc-800"
            >
              <dt className="text-sm text-zinc-500">{insight.label}</dt>
              <dd className="text-right">
                <p className="text-sm font-semibold">{insight.value}</p>
                {insight.detail && (
                  <p className="text-xs text-zinc-400">{insight.detail}</p>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
