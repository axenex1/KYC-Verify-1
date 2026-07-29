import type { AuditEvent } from "@/types/session";

type AuditListener = (event: AuditEvent) => void;

export class ClientAuditLogger {
  private events: AuditEvent[] = [];
  private listeners = new Set<AuditListener>();

  log(type: string, payload?: Record<string, unknown>): void {
    const event: AuditEvent = {
      type,
      timestamp: new Date().toISOString(),
      payload,
    };
    this.events.push(event);
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  subscribe(listener: AuditListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getEvents(): AuditEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}
