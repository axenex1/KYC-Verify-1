import type { SessionExport } from "@/types/session";

export interface ServerSession {
  sessionId: string;
  environment: "application";
  promptSet: string;
  providerId?: string;
  customPromptSetId?: string;
  createdAt: string;
  completedAt?: string;
  export?: SessionExport;
}

const sessions = new Map<string, ServerSession>();

export function createServerSession(
  sessionId: string,
  promptSet: string,
  options?: { providerId?: string; customPromptSetId?: string }
): ServerSession {
  const session: ServerSession = {
    sessionId,
    environment: "application",
    promptSet,
    providerId: options?.providerId,
    customPromptSetId: options?.customPromptSetId,
    createdAt: new Date().toISOString(),
  };
  sessions.set(sessionId, session);
  return session;
}

export function getServerSession(sessionId: string): ServerSession | undefined {
  return sessions.get(sessionId);
}

export function updateServerSessionExport(
  sessionId: string,
  exportData: SessionExport
): ServerSession | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;

  session.export = exportData;
  session.completedAt = exportData.completedAt;
  sessions.set(sessionId, session);
  return session;
}

export function listServerSessions(): ServerSession[] {
  return Array.from(sessions.values()).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
