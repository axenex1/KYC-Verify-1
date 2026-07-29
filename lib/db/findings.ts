import { randomUUID } from "node:crypto";
import { getDb } from "./client";
import type {
  CreateFindingInput,
  Finding,
  FindingSeverity,
  TriageState,
  UpdateFindingInput,
} from "@/types/findings";
import type { VectorPayloadKind } from "@/types/engagement";

interface FindingRow {
  id: string;
  engagement_id: string | null;
  run_id: string | null;
  target_id: string | null;
  title: string;
  description: string | null;
  severity: string;
  vector: string | null;
  triage_state: string;
  evidence: string;
  repro_steps: string | null;
  created_at: string;
  updated_at: string;
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function rowToFinding(row: FindingRow): Finding {
  return {
    id: row.id,
    engagementId: row.engagement_id,
    runId: row.run_id,
    targetId: row.target_id,
    title: row.title,
    description: row.description,
    severity: row.severity as FindingSeverity,
    vector: (row.vector as VectorPayloadKind | null) ?? null,
    triageState: row.triage_state as TriageState,
    evidence: parseJson<Record<string, unknown>>(row.evidence, {}),
    reproSteps: row.repro_steps,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listFindings(filters?: {
  triageState?: TriageState;
  severity?: FindingSeverity;
  engagementId?: string;
  targetId?: string;
}): Finding[] {
  const clauses: string[] = [];
  const params: string[] = [];

  if (filters?.triageState) {
    clauses.push("triage_state = ?");
    params.push(filters.triageState);
  }
  if (filters?.severity) {
    clauses.push("severity = ?");
    params.push(filters.severity);
  }
  if (filters?.engagementId) {
    clauses.push("engagement_id = ?");
    params.push(filters.engagementId);
  }
  if (filters?.targetId) {
    clauses.push("target_id = ?");
    params.push(filters.targetId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = getDb()
    .prepare(`SELECT * FROM findings ${where} ORDER BY created_at DESC`)
    .all(...params) as FindingRow[];

  return rows.map(rowToFinding);
}

export function getFinding(id: string): Finding | undefined {
  const row = getDb()
    .prepare("SELECT * FROM findings WHERE id = ?")
    .get(id) as FindingRow | undefined;
  return row ? rowToFinding(row) : undefined;
}

export function createFinding(input: CreateFindingInput): Finding {
  const now = new Date().toISOString();
  const finding: Finding = {
    id: randomUUID(),
    engagementId: input.engagementId ?? null,
    runId: input.runId ?? null,
    targetId: input.targetId ?? null,
    title: input.title,
    description: input.description ?? null,
    severity: input.severity,
    vector: input.vector ?? null,
    triageState: input.triageState ?? "open",
    evidence: input.evidence ?? {},
    reproSteps: input.reproSteps ?? null,
    createdAt: now,
    updatedAt: now,
  };

  getDb()
    .prepare(
      `INSERT INTO findings (
        id, engagement_id, run_id, target_id, title, description, severity,
        vector, triage_state, evidence, repro_steps, created_at, updated_at
      ) VALUES (
        @id, @engagement_id, @run_id, @target_id, @title, @description, @severity,
        @vector, @triage_state, @evidence, @repro_steps, @created_at, @updated_at
      )`
    )
    .run({
      id: finding.id,
      engagement_id: finding.engagementId,
      run_id: finding.runId,
      target_id: finding.targetId,
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      vector: finding.vector,
      triage_state: finding.triageState,
      evidence: JSON.stringify(finding.evidence),
      repro_steps: finding.reproSteps,
      created_at: finding.createdAt,
      updated_at: finding.updatedAt,
    });

  return finding;
}

export function updateFinding(
  id: string,
  patch: UpdateFindingInput
): Finding | undefined {
  const existing = getFinding(id);
  if (!existing) return undefined;

  const updated: Finding = {
    ...existing,
    title: patch.title ?? existing.title,
    description:
      patch.description !== undefined
        ? patch.description
        : existing.description,
    severity: patch.severity ?? existing.severity,
    triageState: patch.triageState ?? existing.triageState,
    evidence: patch.evidence ?? existing.evidence,
    reproSteps:
      patch.reproSteps !== undefined ? patch.reproSteps : existing.reproSteps,
    updatedAt: new Date().toISOString(),
  };

  getDb()
    .prepare(
      `UPDATE findings SET
        title = @title,
        description = @description,
        severity = @severity,
        triage_state = @triage_state,
        evidence = @evidence,
        repro_steps = @repro_steps,
        updated_at = @updated_at
      WHERE id = @id`
    )
    .run({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      severity: updated.severity,
      triage_state: updated.triageState,
      evidence: JSON.stringify(updated.evidence),
      repro_steps: updated.reproSteps,
      updated_at: updated.updatedAt,
    });

  return updated;
}
