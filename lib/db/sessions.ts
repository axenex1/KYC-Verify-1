import type { SessionExport } from "@/types/session";
import { getDb } from "./client";

export interface ServerSession {
  sessionId: string;
  environment: "qa";
  promptSet: string;
  createdAt: string;
  completedAt?: string;
  export?: SessionExport;
  engagementId?: string | null;
  targetId?: string | null;
}

interface SessionRow {
  session_id: string;
  environment: string;
  prompt_set: string;
  created_at: string;
  completed_at: string | null;
  export_json: string | null;
  engagement_id: string | null;
  target_id: string | null;
  vector_payload: string | null;
  target_verdict: string | null;
  findings_json: string | null;
}

function parseExport(raw: string | null): SessionExport | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as SessionExport;
  } catch {
    return undefined;
  }
}

function rowToSession(row: SessionRow): ServerSession {
  const exportData = parseExport(row.export_json);
  return {
    sessionId: row.session_id,
    environment: "qa",
    promptSet: row.prompt_set,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
    export: exportData,
    engagementId: row.engagement_id,
    targetId: row.target_id,
  };
}

export function createServerSessionRecord(
  sessionId: string,
  promptSet: string,
  opts?: { engagementId?: string; targetId?: string }
): ServerSession {
  const createdAt = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO sessions (
        session_id, environment, prompt_set, created_at, engagement_id, target_id
      ) VALUES (?, 'qa', ?, ?, ?, ?)`
    )
    .run(
      sessionId,
      promptSet,
      createdAt,
      opts?.engagementId ?? null,
      opts?.targetId ?? null
    );

  return {
    sessionId,
    environment: "qa",
    promptSet,
    createdAt,
    engagementId: opts?.engagementId ?? null,
    targetId: opts?.targetId ?? null,
  };
}

export function listSessionsByEngagement(
  engagementId: string
): ServerSession[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM sessions WHERE engagement_id = ? ORDER BY created_at DESC`
    )
    .all(engagementId) as SessionRow[];
  return rows.map(rowToSession);
}

export function getServerSessionRecord(
  sessionId: string
): ServerSession | undefined {
  const row = getDb()
    .prepare("SELECT * FROM sessions WHERE session_id = ?")
    .get(sessionId) as SessionRow | undefined;
  return row ? rowToSession(row) : undefined;
}

export function updateServerSessionExportRecord(
  sessionId: string,
  exportData: SessionExport
): ServerSession | undefined {
  const existing = getServerSessionRecord(sessionId);
  if (!existing) return undefined;

  getDb()
    .prepare(
      `UPDATE sessions SET
        export_json = ?,
        completed_at = ?,
        target_id = COALESCE(?, target_id),
        vector_payload = COALESCE(?, vector_payload),
        target_verdict = COALESCE(?, target_verdict),
        findings_json = COALESCE(?, findings_json)
      WHERE session_id = ?`
    )
    .run(
      JSON.stringify(exportData),
      exportData.completedAt ?? null,
      exportData.target?.id ?? null,
      exportData.vectorPayload
        ? JSON.stringify(exportData.vectorPayload)
        : null,
      exportData.targetVerdict
        ? JSON.stringify(exportData.targetVerdict)
        : null,
      exportData.findings ? JSON.stringify(exportData.findings) : null,
      sessionId
    );

  return {
    ...existing,
    export: exportData,
    completedAt: exportData.completedAt,
  };
}

export function listServerSessionRecords(): ServerSession[] {
  const rows = getDb()
    .prepare("SELECT * FROM sessions ORDER BY created_at DESC")
    .all() as SessionRow[];
  return rows.map(rowToSession);
}
