import { randomUUID } from "node:crypto";
import { getDb } from "./client";
import type {
  CreateEngagementInput,
  Engagement,
  EngagementStatus,
  UpdateEngagementInput,
  VectorPayload,
} from "@/types/engagement";
import type { TargetCapability } from "@/types/targets";

interface EngagementRow {
  id: string;
  target_id: string;
  name: string | null;
  attack_surface: string;
  vector_payloads: string;
  status: string;
  operator_name: string | null;
  authorization_ref: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function rowToEngagement(row: EngagementRow): Engagement {
  return {
    id: row.id,
    targetId: row.target_id,
    name: row.name,
    attackSurface: parseJson<TargetCapability[]>(row.attack_surface, []),
    vectorPayloads: parseJson<VectorPayload[]>(row.vector_payloads, []),
    status: row.status as EngagementStatus,
    operatorName: row.operator_name,
    authorizationRef: row.authorization_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

export function listEngagements(filters?: {
  status?: EngagementStatus;
  targetId?: string;
}): Engagement[] {
  const clauses: string[] = [];
  const params: string[] = [];

  if (filters?.status) {
    clauses.push("status = ?");
    params.push(filters.status);
  }
  if (filters?.targetId) {
    clauses.push("target_id = ?");
    params.push(filters.targetId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = getDb()
    .prepare(
      `SELECT * FROM engagements ${where} ORDER BY created_at DESC`
    )
    .all(...params) as EngagementRow[];

  return rows.map(rowToEngagement);
}

export function getEngagement(id: string): Engagement | undefined {
  const row = getDb()
    .prepare("SELECT * FROM engagements WHERE id = ?")
    .get(id) as EngagementRow | undefined;
  return row ? rowToEngagement(row) : undefined;
}

export function createEngagement(input: CreateEngagementInput): Engagement {
  const now = new Date().toISOString();
  const engagement: Engagement = {
    id: randomUUID(),
    targetId: input.targetId,
    name: input.name ?? null,
    attackSurface: input.attackSurface ?? [],
    vectorPayloads: input.vectorPayloads ?? [],
    status: input.status ?? "draft",
    operatorName: input.operatorName ?? null,
    authorizationRef: input.authorizationRef ?? null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };

  getDb()
    .prepare(
      `INSERT INTO engagements (
        id, target_id, name, attack_surface, vector_payloads, status,
        operator_name, authorization_ref, created_at, updated_at, completed_at
      ) VALUES (
        @id, @target_id, @name, @attack_surface, @vector_payloads, @status,
        @operator_name, @authorization_ref, @created_at, @updated_at, @completed_at
      )`
    )
    .run({
      id: engagement.id,
      target_id: engagement.targetId,
      name: engagement.name,
      attack_surface: JSON.stringify(engagement.attackSurface),
      vector_payloads: JSON.stringify(engagement.vectorPayloads),
      status: engagement.status,
      operator_name: engagement.operatorName,
      authorization_ref: engagement.authorizationRef,
      created_at: engagement.createdAt,
      updated_at: engagement.updatedAt,
      completed_at: engagement.completedAt,
    });

  return engagement;
}

export function updateEngagement(
  id: string,
  patch: UpdateEngagementInput
): Engagement | undefined {
  const existing = getEngagement(id);
  if (!existing) return undefined;

  const updated: Engagement = {
    ...existing,
    name: patch.name !== undefined ? patch.name : existing.name,
    attackSurface: patch.attackSurface ?? existing.attackSurface,
    vectorPayloads: patch.vectorPayloads ?? existing.vectorPayloads,
    status: patch.status ?? existing.status,
    operatorName:
      patch.operatorName !== undefined
        ? patch.operatorName
        : existing.operatorName,
    authorizationRef:
      patch.authorizationRef !== undefined
        ? patch.authorizationRef
        : existing.authorizationRef,
    completedAt:
      patch.completedAt !== undefined
        ? patch.completedAt
        : existing.completedAt,
    updatedAt: new Date().toISOString(),
  };

  getDb()
    .prepare(
      `UPDATE engagements SET
        name = @name,
        attack_surface = @attack_surface,
        vector_payloads = @vector_payloads,
        status = @status,
        operator_name = @operator_name,
        authorization_ref = @authorization_ref,
        completed_at = @completed_at,
        updated_at = @updated_at
      WHERE id = @id`
    )
    .run({
      id: updated.id,
      name: updated.name,
      attack_surface: JSON.stringify(updated.attackSurface),
      vector_payloads: JSON.stringify(updated.vectorPayloads),
      status: updated.status,
      operator_name: updated.operatorName,
      authorization_ref: updated.authorizationRef,
      completed_at: updated.completedAt,
      updated_at: updated.updatedAt,
    });

  return updated;
}
