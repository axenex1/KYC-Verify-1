import type { SessionExport } from "@/types/session";
import {
  createServerSessionRecord,
  getServerSessionRecord,
  listServerSessionRecords,
  updateServerSessionExportRecord,
  type ServerSession,
} from "@/lib/db/sessions";

export type { ServerSession };

/**
 * Persistent session store backed by SQLite.
 * Function signatures match the previous in-memory Map API so
 * existing `/api/sessions` routes keep working unchanged.
 */
export function createServerSession(
  sessionId: string,
  promptSet: string,
  opts?: { engagementId?: string; targetId?: string }
): ServerSession {
  return createServerSessionRecord(sessionId, promptSet, opts);
}

export function getServerSession(sessionId: string): ServerSession | undefined {
  return getServerSessionRecord(sessionId);
}

export function updateServerSessionExport(
  sessionId: string,
  exportData: SessionExport
): ServerSession | undefined {
  return updateServerSessionExportRecord(sessionId, exportData);
}

export function listServerSessions(): ServerSession[] {
  return listServerSessionRecords();
}
