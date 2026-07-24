"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { LivenessPrompt } from "@/lib/session/types";
import { Eye, Smile, MoveLeft, MoveRight, User, Timer } from "lucide-react";

interface PromptCardProps {
  prompt: LivenessPrompt;
  attempt: number;
  confidence?: number;
  status: "active" | "passed" | "failed" | "pending";
  elapsedMs?: number;
}

const promptIcons: Record<string, React.ComponentType<{ className?: string }>> =
  {
    center_face: User,
    blink_twice: Eye,
    turn_left: MoveLeft,
    turn_right: MoveRight,
    smile: Smile,
    hold_still: Timer,
  };

export function PromptCard({
  prompt,
  attempt,
  confidence,
  status,
  elapsedMs = 0,
}: PromptCardProps) {
  const Icon = promptIcons[prompt.id] ?? User;
  const [elapsedDisplay, setElapsedDisplay] = useState("0:00");

  // Animate elapsed time for active prompts
  useEffect(() => {
    if (status !== "active") return;
    const interval = setInterval(() => {
      const totalSec = Math.floor(elapsedMs / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      setElapsedDisplay(`${min}:${sec.toString().padStart(2, "0")}`);
    }, 500);
    return () => clearInterval(interval);
  }, [elapsedMs, status]);

  const timeProgress = Math.min(
    100,
    (elapsedMs / prompt.timeoutMs) * 100
  );

  return (
    <Card className="overflow-hidden border-zinc-200/60 transition-all dark:border-zinc-800/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${
                status === "active"
                  ? "bg-primary/10 ring-primary/20"
                  : status === "passed"
                    ? "bg-emerald-500/10 ring-emerald-500/20"
                    : status === "failed"
                      ? "bg-destructive/10 ring-destructive/20"
                      : "bg-muted ring-border"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${
                  status === "active"
                    ? "text-primary"
                    : status === "passed"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : status === "failed"
                        ? "text-destructive"
                        : "text-muted-foreground"
                }`}
              />
            </div>
            <div>
              <CardTitle className="text-base">{prompt.title}</CardTitle>
              <CardDescription className="mt-0.5">
                {prompt.instruction}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={
              status === "passed"
                ? "success"
                : status === "failed"
                  ? "destructive"
                  : status === "active"
                    ? "warning"
                    : "secondary"
            }
            className="shrink-0"
          >
            {status === "active"
              ? "In progress"
              : status === "passed"
                ? "Passed"
                : status === "failed"
                  ? `Attempt ${attempt}`
                  : "Pending"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress bar for active prompts */}
        {status === "active" && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{elapsedDisplay}</span>
              <span>
                {Math.ceil(prompt.timeoutMs / 1000)}s timeout
              </span>
            </div>
            <Progress
              value={timeProgress}
              className="h-1.5"
              // Progress component doesn't have color variant, so we accept default
            />
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Attempt {attempt} of {prompt.maxAttempts}
          </span>
          {confidence !== undefined && status === "active" && (
            <span className="font-mono tabular-nums">
              {Math.round(confidence * 100)}% confidence
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
