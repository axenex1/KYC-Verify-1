import type { FindingSeverity } from "@/types/findings";
import type { TargetVerdict, VectorPayloadKind } from "@/types/engagement";

export type GapType =
  | "false_accept"
  | "weak_signal"
  | "review_bypass"
  | "error_gap"
  | "none";

/**
 * Map attacker-intent vs target-verdict gap to severity.
 */
export function scoreSeverity(
  gap: GapType,
  vector?: VectorPayloadKind | null
): FindingSeverity {
  switch (gap) {
    case "false_accept":
      return vector === "deepfake" || vector === "document" ? "critical" : "high";
    case "review_bypass":
      return "high";
    case "weak_signal":
      return "medium";
    case "error_gap":
      return "low";
    case "none":
      return "low";
    default: {
      const _exhaustive: never = gap;
      throw new Error(`Unhandled gap type: ${String(_exhaustive)}`);
    }
  }
}

export function classifyGap(
  intentKind: VectorPayloadKind | undefined,
  verdict: TargetVerdict | undefined
): GapType {
  if (!intentKind || !verdict) return "none";

  switch (verdict.outcome) {
    case "pass":
      // Attacker injected a vector and target accepted — detection gap.
      return "false_accept";
    case "review":
      return "review_bypass";
    case "fail":
      return "none";
    case "error":
      return "error_gap";
    case "unknown":
      return "weak_signal";
    default: {
      const _exhaustive: never = verdict.outcome;
      throw new Error(`Unhandled verdict outcome: ${String(_exhaustive)}`);
    }
  }
}
