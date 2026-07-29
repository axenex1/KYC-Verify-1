import type { Target } from "@/types/targets";
import type { TargetVerdict, VectorPayload } from "@/types/engagement";

export interface AttemptPayload {
  vector?: VectorPayload;
  /** Opaque capture / media / SDK payload for the target. */
  media?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Pluggable KYC detection target.
 * Implementations: MediaPipe local, vendor SDK iframe, vendor sandbox API.
 */
export interface TargetAdapter {
  readonly id: string;
  readonly label: string;
  loadTarget(target: Target): Promise<void>;
  submitAttempt(payload: AttemptPayload): Promise<{ attemptId: string }>;
  pollVerdict(attemptId: string): Promise<TargetVerdict>;
  teardown?(): Promise<void>;
}

export type TargetAdapterFactory = (target: Target) => TargetAdapter;
