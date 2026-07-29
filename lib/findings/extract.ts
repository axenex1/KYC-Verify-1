import type { CreateFindingInput, Finding } from "@/types/findings";
import type { TargetVerdict, VectorPayload } from "@/types/engagement";
import type { SessionExport } from "@/types/session";
import { classifyGap, scoreSeverity } from "./severity";

export interface ExtractableRun {
  id?: string | null;
  engagementId?: string | null;
  targetId?: string | null;
  vectorPayload?: VectorPayload | null;
  targetVerdict?: TargetVerdict | null;
  sessionExport?: SessionExport | null;
}

function newId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `finding-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Diff attacker intent vs target verdict and produce finding drafts.
 * Safe for browser + Node (no node:crypto).
 */
export function extractFindings(run: ExtractableRun): Finding[] {
  const vector = run.vectorPayload ?? undefined;
  const verdict = run.targetVerdict ?? undefined;
  const kind = vector?.kind;
  const gap = classifyGap(kind, verdict);

  if (gap === "none") {
    return [];
  }

  const now = new Date().toISOString();
  const severity = scoreSeverity(gap, kind);
  const engagementId = run.engagementId ?? null;
  const runId = typeof run.id === "string" ? run.id : null;
  const targetId = run.targetId ?? run.sessionExport?.target?.id ?? null;

  const titleByGap: Record<string, string> = {
    false_accept: `Target accepted ${kind ?? "vector"} payload`,
    review_bypass: `Target sent ${kind ?? "vector"} to manual review only`,
    weak_signal: `Target returned inconclusive verdict for ${kind ?? "vector"}`,
    error_gap: `Target errored during ${kind ?? "vector"} probe`,
  };

  const finding: Finding = {
    id: newId(),
    engagementId,
    runId,
    targetId,
    title: titleByGap[gap] ?? `Detection gap (${gap})`,
    description: `Gap type: ${gap}. Vector: ${kind ?? "none"}. Verdict: ${verdict?.outcome ?? "n/a"}.`,
    severity,
    vector: kind ?? null,
    triageState: "open",
    evidence: {
      gap,
      vector: vector ?? null,
      targetVerdict: verdict ?? null,
      sessionId: run.sessionExport?.sessionId,
      promptResults: run.sessionExport?.promptResults,
    },
    reproSteps: kind
      ? `1. Configure ${kind} vector\n2. Submit probe attempt\n3. Observe target verdict = ${verdict?.outcome}`
      : null,
    createdAt: now,
    updatedAt: now,
  };

  return [finding];
}

/** Map a draft finding to the API create body (server assigns canonical id). */
export function toCreateFindingInput(finding: Finding): CreateFindingInput {
  return {
    engagementId: finding.engagementId ?? undefined,
    runId: finding.runId ?? undefined,
    targetId: finding.targetId ?? undefined,
    title: finding.title,
    description: finding.description ?? undefined,
    severity: finding.severity,
    vector: finding.vector ?? undefined,
    triageState: finding.triageState,
    evidence: finding.evidence,
    reproSteps: finding.reproSteps ?? undefined,
  };
}
