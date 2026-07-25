"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  FastForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AuditEvent } from "@/types/session";

interface ReplayPlayerProps {
  events: AuditEvent[];
  createdAt: string;
}

const EVENT_COLORS: Record<string, string> = {
  session_started: "bg-blue-500",
  prompt_shown: "bg-zinc-400",
  prompt_passed: "bg-emerald-500",
  prompt_failed: "bg-red-500",
  prompt_retry: "bg-amber-500",
  motion_detected: "bg-violet-500",
  session_completed: "bg-emerald-600",
  device_paired: "bg-cyan-500",
  device_disconnected: "bg-orange-500",
  camera_switched: "bg-sky-400",
  distortion_changed: "bg-purple-400",
  transform_proposed: "bg-indigo-400",
  transform_applied: "bg-indigo-600",
  transform_rejected: "bg-rose-400",
};

const SPEEDS = [0.5, 1, 2, 4] as const;
type Speed = (typeof SPEEDS)[number];

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function ReplayPlayer({ events, createdAt }: ReplayPlayerProps) {
  const startMs = new Date(createdAt).getTime();

  const relativeEvents = events.map((e) => ({
    ...e,
    relativeMs: Math.max(0, new Date(e.timestamp).getTime() - startMs),
  }));

  const duration =
    relativeEvents.length > 0
      ? relativeEvents[relativeEvents.length - 1].relativeMs
      : 0;

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [playheadMs, setPlayheadMs] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTick = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const reset = useCallback(() => {
    clearTick();
    setPlaying(false);
    setPlayheadMs(0);
  }, []);

  useEffect(() => {
    clearTick();
    if (!playing) return;
    if (playheadMs >= duration && duration > 0) {
      setPlaying(false);
      return;
    }

    // Advance playhead by TICK_MS every TICK_MS real-time ms
    const TICK_MS = 100;
    intervalRef.current = setInterval(() => {
      setPlayheadMs((prev) => {
        const next = prev + TICK_MS * speed;
        if (next >= duration) {
          setPlaying(false);
          return duration;
        }
        return next;
      });
    }, TICK_MS);

    return clearTick;
  }, [playing, speed, duration]);

  const activeEvents = relativeEvents.filter(
    (e) => e.relativeMs <= playheadMs
  );

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Replay</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">No audit events to replay.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Replay</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            aria-label="Reset"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={playing ? "secondary" : "default"}
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {playing ? "Pause" : "Play"}
          </Button>

          <div className="flex items-center gap-1">
            <FastForward className="h-3.5 w-3.5 text-zinc-400" />
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={cn(
                  "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                  speed === s
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                {s}×
              </button>
            ))}
          </div>

          <span className="ml-auto font-mono text-xs text-zinc-500">
            {formatMs(playheadMs)} / {formatMs(duration)}
          </span>
        </div>

        {/* Scrubber */}
        <input
          type="range"
          min={0}
          max={duration}
          step={100}
          value={playheadMs}
          onChange={(e) => {
            clearTick();
            setPlaying(false);
            setPlayheadMs(Number(e.target.value));
          }}
          className="h-1.5 w-full cursor-pointer accent-zinc-900 dark:accent-zinc-100"
          aria-label="Playhead position"
        />

        {/* Event timeline */}
        <ol
          className="relative max-h-64 space-y-2 overflow-y-auto border-l border-zinc-200 pl-4 dark:border-zinc-800"
          aria-label="Audit events"
        >
          {relativeEvents.map((event, i) => {
            const isActive = event.relativeMs <= playheadMs;
            const isCurrent =
              isActive &&
              (i === relativeEvents.length - 1 ||
                relativeEvents[i + 1].relativeMs > playheadMs);

            return (
              <li key={`${event.type}-${i}`} className={cn("relative transition-opacity", isActive ? "opacity-100" : "opacity-30")}>
                <span
                  className={cn(
                    "absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full",
                    EVENT_COLORS[event.type] ?? "bg-zinc-400",
                    isCurrent && "ring-2 ring-offset-1 ring-zinc-300 dark:ring-zinc-600"
                  )}
                />
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium capitalize">
                    {event.type.replace(/_/g, " ")}
                    {typeof event.payload?.prompt === "string" && (
                      <span className="ml-1 text-zinc-400">
                        · {String(event.payload.prompt).replace(/_/g, " ")}
                      </span>
                    )}
                  </p>
                  <span className="shrink-0 font-mono text-xs text-zinc-400">
                    {formatMs(event.relativeMs)}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Active events count badge */}
        <p className="text-xs text-zinc-400">
          <Badge variant="secondary">{activeEvents.length}</Badge> of{" "}
          {relativeEvents.length} events
        </p>
      </CardContent>
    </Card>
  );
}
