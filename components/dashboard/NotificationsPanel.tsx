"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DashboardAlert } from "@/types/dashboard";
import { AlertTriangle, Info, XCircle } from "lucide-react";

interface NotificationsPanelProps {
  alerts: DashboardAlert[];
}

function severityIcon(severity: DashboardAlert["severity"]) {
  switch (severity) {
    case "critical":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "info":
      return <Info className="h-4 w-4 text-blue-500" />;
    default: {
      const _exhaustive: never = severity;
      return _exhaustive;
    }
  }
}

function severityVariant(
  severity: DashboardAlert["severity"]
): "destructive" | "warning" | "secondary" {
  switch (severity) {
    case "critical":
      return "destructive";
    case "warning":
      return "warning";
    case "info":
      return "secondary";
    default: {
      const _exhaustive: never = severity;
      return _exhaustive;
    }
  }
}

export function NotificationsPanel({ alerts }: NotificationsPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Notifications & Alerts</CardTitle>
        {alerts.length > 0 && (
          <Badge variant="warning">{alerts.length}</Badge>
        )}
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No anomalies detected across completed sessions.
          </p>
        ) : (
          <ul className="space-y-3">
            {alerts.slice(0, 8).map((alert) => (
              <li
                key={alert.id}
                className="flex gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div className="mt-0.5 shrink-0">{severityIcon(alert.severity)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <Badge variant={severityVariant(alert.severity)}>
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {alert.message}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-zinc-400">
                    <time dateTime={alert.timestamp}>
                      {new Date(alert.timestamp).toLocaleString()}
                    </time>
                    {alert.sessionId && (
                      <Link
                        href={`/dashboard/${alert.sessionId}`}
                        className="text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      >
                        View session
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
