"use client";

import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RegressionStatus } from "@/types/dashboard";
import { REGRESSION_BASELINES } from "@/lib/regression/baselines";

interface RegressionPanelProps {
  regression: RegressionStatus;
}

function formatValue(value: number, unit?: string): string {
  if (unit === "%") return `${Math.round(value * 100)}%`;
  if (unit === "ms") {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
  }
  return String(Math.round(value));
}

function formatThreshold(threshold: number, unit?: string): string {
  return formatValue(threshold, unit);
}

export function RegressionPanel({ regression }: RegressionPanelProps) {
  const { meetsBaseline, sufficientData, sessionCount, checks, checkedAt } = regression;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Regression Status</CardTitle>
          {!sufficientData ? (
            <Badge variant="secondary">
              <AlertTriangle className="mr-1 h-3.5 w-3.5" />
              Need {REGRESSION_BASELINES.minSessions} sessions
            </Badge>
          ) : meetsBaseline ? (
            <Badge variant="success">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              Passing
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="mr-1 h-3.5 w-3.5" />
              Failing
            </Badge>
          )}
        </div>
        <p className="text-xs text-zinc-400">
          {sufficientData
            ? `Based on ${sessionCount} completed session${sessionCount !== 1 ? "s" : ""}`
            : `${sessionCount} of ${REGRESSION_BASELINES.minSessions} sessions required`}
          {" · "}Updated {new Date(checkedAt).toLocaleTimeString()}
        </p>
      </CardHeader>
      <CardContent>
        {!sufficientData ? (
          <p className="text-sm text-zinc-500">
            Complete at least {REGRESSION_BASELINES.minSessions} sessions to see
            baseline regression results.
          </p>
        ) : (
          <div className="space-y-2">
            {checks.map((check) => (
              <div
                key={check.name}
                className={cn(
                  "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
                  check.passed
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
                    : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
                )}
              >
                <div className="flex items-center gap-2">
                  {check.passed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                  )}
                  <span className="capitalize">{check.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span
                    className={cn(
                      "font-semibold",
                      check.passed ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"
                    )}
                  >
                    {formatValue(check.value, check.unit)}
                  </span>
                  <span>/</span>
                  <span>threshold {formatThreshold(check.threshold, check.unit)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
