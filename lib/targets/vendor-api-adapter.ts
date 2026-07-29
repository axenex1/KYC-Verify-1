import { randomUUID } from "node:crypto";
import type { Target } from "@/types/targets";
import type { TargetVerdict } from "@/types/engagement";
import type { AttemptPayload, TargetAdapter } from "./types";

/**
 * Vendor sandbox API adapter stub - direct API calls via credential vault (later).
 */
export class VendorApiTargetAdapter implements TargetAdapter {
  readonly id: string;
  readonly label: string;
  private loaded: Target | null = null;
  private attempts = new Map<string, AttemptPayload>();

  constructor(target: Target) {
    this.id = target.id;
    this.label = `${target.vendor} API`;
  }

  async loadTarget(target: Target): Promise<void> {
    this.loaded = target;
  }

  async submitAttempt(payload: AttemptPayload): Promise<{ attemptId: string }> {
    if (!this.loaded) {
      throw new Error("Vendor API target not loaded");
    }
    const attemptId = randomUUID();
    this.attempts.set(attemptId, payload);
    return { attemptId };
  }

  async pollVerdict(attemptId: string): Promise<TargetVerdict> {
    if (!this.attempts.has(attemptId)) {
      return {
        outcome: "error",
        signals: { reason: "unknown_attempt" },
        receivedAt: new Date().toISOString(),
      };
    }

    return {
      outcome: "unknown",
      confidence: 0,
      signals: {
        adapter: "vendor-api",
        vendor: this.loaded?.vendor,
        note: "Stub - wire sandbox API via Settings credential vault",
      },
      receivedAt: new Date().toISOString(),
    };
  }

  async teardown(): Promise<void> {
    this.attempts.clear();
    this.loaded = null;
  }
}

export function createVendorApiTargetAdapter(target: Target): TargetAdapter {
  return new VendorApiTargetAdapter(target);
}
