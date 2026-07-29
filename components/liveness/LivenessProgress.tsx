"use client";

import { LIVENESS_PROMPTS } from "@/lib/session/prompts";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LivenessProgressProps {
  currentStepIndex: number;
  passedSteps?: number[];
}

export function LivenessProgress({
  currentStepIndex,
  passedSteps = [],
}: LivenessProgressProps) {
  const total = LIVENESS_PROMPTS.length;
  const progress = total > 0 ? (currentStepIndex / total) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold tracking-tight">
          Liveness Prompts
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {Math.min(currentStepIndex, total)} of {total} complete
        </span>
      </div>

      {/* Progress bar */}
      <Progress value={progress} className="h-2" />

      {/* Step indicators */}
      <div className="space-y-1">
        {LIVENESS_PROMPTS.map((prompt, index) => {
          const isActive = index === currentStepIndex;
          const isComplete = index < currentStepIndex || passedSteps.includes(index);
          const isFuture = index > currentStepIndex;

          return (
            <div
              key={prompt.id}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive && "bg-accent",
                isComplete && "text-muted-foreground"
              )}
            >
              {/* Status icon */}
              {isComplete ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : isActive ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
              )}

              {/* Step label */}
              <span
                className={cn(
                  "flex-1 capitalize",
                  isActive && "font-medium",
                  isFuture && "text-zinc-400 dark:text-zinc-500"
                )}
              >
                {prompt.title}
              </span>

              {/* Step number */}
              <span
                className={cn(
                  "text-xs tabular-nums",
                  isFuture
                    ? "text-zinc-400 dark:text-zinc-500"
                    : "text-muted-foreground"
                )}
              >
                {index + 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
