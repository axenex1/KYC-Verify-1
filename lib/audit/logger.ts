import type { AuditEvent } from "@/types/session";

export class ClientAuditLogger {
  private events: AuditEvent[] = [];

  log(type: string, payload?: Record<string, unknown>): void {
    this.events.push({
      type,
      timestamp: new Date().toISOString(),
      payload,
    });
  }

  getEvents(): AuditEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}
