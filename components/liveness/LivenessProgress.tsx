"use client";

import { LIVENESS_PROMPTS } from "@/lib/session/prompts";
import { Progress } from "@/components/ui/progress";

interface LivenessProgressProps {
  currentStepIndex: number;
}

export function LivenessProgress({ currentStepIndex }: LivenessProgressProps) {
  const total = LIVENESS_PROMPTS.length;
  const progress = total > 0 ? ((currentStepIndex) / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Progress
        </span>
        <span className="text-zinc-500">
          {Math.min(currentStepIndex + 1, total)} / {total}
        </span>
      </div>
      <Progress value={progress} />
    </div>
  );
}
