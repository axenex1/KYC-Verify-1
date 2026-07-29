import { randomUUID } from "node:crypto";

import { getDb } from "./client";

import type {

  Run,

  RunStatus,

  TargetVerdict,

  VectorPayload,

} from "@/types/engagement";



interface RunRow {

  id: string;

  engagement_id: string;

  session_id: string | null;

  status: string;

  vector_payload: string | null;

  target_verdict: string | null;

  started_at: string;

  completed_at: string | null;

  metadata: string;

}



function parseJson<T>(raw: string | null, fallback: T): T {

  if (!raw) return fallback;

  try {

    return JSON.parse(raw) as T;

  } catch {

    return fallback;

  }

}



function rowToRun(row: RunRow): Run {

  return {

    id: row.id,

    engagementId: row.engagement_id,

    sessionId: row.session_id,

    status: row.status as RunStatus,

    vectorPayload: parseJson<VectorPayload | null>(row.vector_payload, null),

    targetVerdict: parseJson<TargetVerdict | null>(row.target_verdict, null),

    startedAt: row.started_at,

    completedAt: row.completed_at,

    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),

  };

}



export function listRunsByEngagement(engagementId: string): Run[] {

  const rows = getDb()

    .prepare(

      `SELECT * FROM runs WHERE engagement_id = ? ORDER BY started_at DESC`

    )

    .all(engagementId) as RunRow[];

  return rows.map(rowToRun);

}



export function getRun(id: string): Run | undefined {

  const row = getDb()

    .prepare("SELECT * FROM runs WHERE id = ?")

    .get(id) as RunRow | undefined;

  return row ? rowToRun(row) : undefined;

}



export function createRun(input: {

  engagementId: string;

  sessionId?: string;

  vectorPayload?: VectorPayload | null;

  metadata?: Record<string, unknown>;

}): Run {

  const now = new Date().toISOString();

  const run: Run = {

    id: randomUUID(),

    engagementId: input.engagementId,

    sessionId: input.sessionId ?? null,

    status: "running",

    vectorPayload: input.vectorPayload ?? null,

    targetVerdict: null,

    startedAt: now,

    completedAt: null,

    metadata: input.metadata ?? {},

  };



  getDb()

    .prepare(

      `INSERT INTO runs (

        id, engagement_id, session_id, status, vector_payload, target_verdict,

        started_at, completed_at, metadata

      ) VALUES (

        @id, @engagement_id, @session_id, @status, @vector_payload, @target_verdict,

        @started_at, @completed_at, @metadata

      )`

    )

    .run({

      id: run.id,

      engagement_id: run.engagementId,

      session_id: run.sessionId,

      status: run.status,

      vector_payload: run.vectorPayload

        ? JSON.stringify(run.vectorPayload)

        : null,

      target_verdict: null,

      started_at: run.startedAt,

      completed_at: null,

      metadata: JSON.stringify(run.metadata),

    });



  return run;

}



export function updateRun(

  id: string,

  patch: {

    status?: RunStatus;

    sessionId?: string | null;

    vectorPayload?: VectorPayload | null;

    targetVerdict?: TargetVerdict | null;

    completedAt?: string | null;

    metadata?: Record<string, unknown>;

  }

): Run | undefined {

  const existing = getRun(id);

  if (!existing) return undefined;



  const updated: Run = {

    ...existing,

    status: patch.status ?? existing.status,

    sessionId:

      patch.sessionId !== undefined ? patch.sessionId : existing.sessionId,

    vectorPayload:

      patch.vectorPayload !== undefined

        ? patch.vectorPayload

        : existing.vectorPayload,

    targetVerdict:

      patch.targetVerdict !== undefined

        ? patch.targetVerdict

        : existing.targetVerdict,

    completedAt:

      patch.completedAt !== undefined

        ? patch.completedAt

        : existing.completedAt,

    metadata: patch.metadata ?? existing.metadata,

  };



  getDb()

    .prepare(

      `UPDATE runs SET

        session_id = @session_id,

        status = @status,

        vector_payload = @vector_payload,

        target_verdict = @target_verdict,

        completed_at = @completed_at,

        metadata = @metadata

      WHERE id = @id`

    )

    .run({

      id: updated.id,

      session_id: updated.sessionId,

      status: updated.status,

      vector_payload: updated.vectorPayload

        ? JSON.stringify(updated.vectorPayload)

        : null,

      target_verdict: updated.targetVerdict

        ? JSON.stringify(updated.targetVerdict)

        : null,

      completed_at: updated.completedAt,

      metadata: JSON.stringify(updated.metadata),

    });



  return updated;

}

