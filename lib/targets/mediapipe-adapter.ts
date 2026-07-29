import { randomUUID } from "node:crypto";
import type { Target } from "@/types/targets";
import type { TargetVerdict } from "@/types/engagement";
import type { AttemptPayload, TargetAdapter } from "./types";

/**
 * Local MediaPipe fallback target.
 * Thin stub that simulates liveness verdicts; later phases wire real face/liveness.
 */
export class MediaPipeTargetAdapter implements TargetAdapter {
  readonly id: string;
  readonly label = "MediaPipe Local";
  private loaded: Target | null = null;
  private attempts = new Map<string, AttemptPayload>();

  constructor(target: Target) {
    this.id = target.id;
  }

  async loadTarget(target: Target): Promise<void> {
    this.loaded = target;
  }

  async submitAttempt(payload: AttemptPayload): Promise<{ attemptId: string }> {
    if (!this.loaded) {
      throw new Error("MediaPipe target not loaded");
    }
    const attemptId = randomUUID();
    this.attempts.set(attemptId, payload);
    return { attemptId };
  }

  async pollVerdict(attemptId: string): Promise<TargetVerdict> {
    const attempt = this.attempts.get(attemptId);
    if (!attempt) {
      return {
        outcome: "error",
        signals: { reason: "unknown_attempt" },
        receivedAt: new Date().toISOString(),
      };
    }

    // Simulated local detection: deepfake vectors tend to pass (gap), others fail.
    const kind = attempt.vector?.kind;
    const outcome =
      kind === "deepfake" ? "pass" : kind === "document" ? "review" : "fail";

    return {
      outcome,
      confidence: outcome === "pass" ? 0.72 : 0.88,
      signals: {
        adapter: "mediapipe",
        vector: kind ?? "none",
        note: "Simulated MediaPipe verdict - replace with real face/liveness pipeline",
      },
      receivedAt: new Date().toISOString(),
    };
  }

  async teardown(): Promise<void> {
    this.attempts.clear();
    this.loaded = null;
  }
}

export function createMediaPipeTargetAdapter(target: Target): TargetAdapter {
  return new MediaPipeTargetAdapter(target);
}
