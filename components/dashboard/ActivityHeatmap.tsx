"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HeatmapCell } from "@/types/dashboard";
import { formatDayLabel } from "@/lib/dashboard/aggregations";
import { cn } from "@/lib/utils";

interface ActivityHeatmapProps {
  cells: HeatmapCell[];
}

function intensityClass(intensity: number): string {
  if (intensity === 0) return "bg-zinc-100 dark:bg-zinc-800";
  if (intensity < 0.25) return "bg-emerald-200 dark:bg-emerald-900";
  if (intensity < 0.5) return "bg-emerald-400 dark:bg-emerald-700";
  if (intensity < 0.75) return "bg-emerald-500 dark:bg-emerald-600";
  return "bg-emerald-600 dark:bg-emerald-500";
}

export function ActivityHeatmap({ cells }: ActivityHeatmapProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = Array.from({ length: 7 }, (_, i) => i);

  const cellMap = new Map(cells.map((c) => [`${c.day}-${c.hour}`, c]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-zinc-500">
          Session frequency by day and hour (local time)
        </p>
        <div className="overflow-x-auto">
          <div className="inline-grid min-w-[600px] gap-1">
            <div className="grid grid-cols-[3rem_repeat(24,1fr)] gap-1">
              <div />
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="text-center text-[10px] text-zinc-400"
                >
                  {hour % 6 === 0 ? `${hour}h` : ""}
                </div>
              ))}
              {days.map((day) => (
                <div key={day} className="contents">
                  <div className="flex items-center text-xs text-zinc-500">
                    {formatDayLabel(day)}
                  </div>
                  {hours.map((hour) => {
                    const cell = cellMap.get(`${day}-${hour}`);
                    const intensity = cell?.intensity ?? 0;
                    const count = cell?.sessionCount ?? 0;
                    return (
                      <div
                        key={`${day}-${hour}`}
                        title={`${formatDayLabel(day)} ${hour}:00 - ${count} session(s)`}
                        className={cn(
                          "aspect-square rounded-sm",
                          intensityClass(intensity)
                        )}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
          <span>Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((level) => (
            <div
              key={level}
              className={cn("h-3 w-3 rounded-sm", intensityClass(level))}
            />
          ))}
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}
