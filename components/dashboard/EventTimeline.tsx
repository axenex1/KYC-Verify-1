"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimelineEvent } from "@/types/dashboard";
import { cn } from "@/lib/utils";

interface EventTimelineProps {
  events: TimelineEvent[];
}

const eventColors: Record<string, string> = {
  session_started: "bg-blue-500",
  prompt_shown: "bg-zinc-400",
  prompt_passed: "bg-emerald-500",
  prompt_failed: "bg-red-500",
  prompt_retry: "bg-amber-500",
  motion_detected: "bg-violet-500",
  session_completed: "bg-emerald-600",
};

export function EventTimeline({ events }: EventTimelineProps) {
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Event Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">No audit events recorded.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-4 border-l border-zinc-200 pl-4 dark:border-zinc-800">
          {events.map((event) => (
            <li key={event.id} className="relative">
              <span
                className={cn(
                  "absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full",
                  eventColors[event.type] ?? "bg-zinc-400"
                )}
              />
              <p className="text-sm font-medium">{event.label}</p>
              <time
                className="text-xs text-zinc-500"
                dateTime={event.timestamp}
              >
                {new Date(event.timestamp).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </time>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
