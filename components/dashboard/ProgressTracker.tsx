"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { PromptAggregate } from "@/types/dashboard";

interface ProgressTrackerProps {
  aggregates: PromptAggregate[];
}

function formatPromptLabel(prompt: string): string {
  return prompt.replace(/_/g, " ");
}

export function ProgressTracker({ aggregates }: ProgressTrackerProps) {
  const hasData = aggregates.some((a) => a.passRate > 0 || a.totalAttempts > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress Tracker</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData ? (
          <p className="text-sm text-zinc-500">
            Prompt-level pass rates will appear after completed sessions.
          </p>
        ) : (
          aggregates.map((agg) => (
            <div key={agg.prompt} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium capitalize">
                  {formatPromptLabel(agg.prompt)}
                </span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      agg.passRate >= 1
                        ? "success"
                        : agg.passRate >= 0.5
                          ? "warning"
                          : "destructive"
                    }
                  >
                    {Math.round(agg.passRate * 100)}%
                  </Badge>
                  <span className="text-xs text-zinc-500">
                    {Math.round(agg.avgConfidence * 100)}% conf
                  </span>
                </div>
              </div>
              <Progress value={agg.passRate * 100} />
              <p className="text-xs text-zinc-500">
                Avg {Math.round(agg.avgDurationMs / 1000)}s · {agg.totalAttempts}{" "}
                total attempts
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
