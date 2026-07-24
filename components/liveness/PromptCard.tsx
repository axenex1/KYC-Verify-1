"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LivenessPrompt } from "@/lib/session/types";

interface PromptCardProps {
  prompt: LivenessPrompt;
  attempt: number;
  confidence?: number;
  status: "active" | "passed" | "failed" | "pending";
}

export function PromptCard({
  prompt,
  attempt,
  confidence,
  status,
}: PromptCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{prompt.title}</CardTitle>
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
          >
            {status === "active"
              ? "In progress"
              : status === "passed"
                ? "Passed"
                : status === "failed"
                  ? "Retry"
                  : "Pending"}
          </Badge>
        </div>
        <CardDescription>{prompt.instruction}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
        <p>Attempt {attempt} of {prompt.maxAttempts}</p>
        {confidence !== undefined && status === "active" && (
          <p className="mt-1">Confidence: {Math.round(confidence * 100)}%</p>
        )}
      </CardContent>
    </Card>
  );
}
