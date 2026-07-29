import type { FindingSeverity, TriageState } from "@/types/findings";
import type { EngagementStatus } from "@/types/engagement";
import type { TargetStatus } from "@/types/targets";

export function targetStatusClass(status: TargetStatus): string {
  switch (status) {
    case "active":
      return "text-neon-green";
    case "inactive":
      return "text-muted-foreground";
    case "error":
      return "text-neon-red";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function engagementStatusClass(status: EngagementStatus): string {
  switch (status) {
    case "active":
      return "text-neon-green";
    case "draft":
      return "text-neon-cyan";
    case "completed":
      return "text-muted-foreground";
    case "archived":
      return "text-muted-foreground/70";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function severityClass(severity: FindingSeverity): string {
  switch (severity) {
    case "critical":
      return "text-neon-red";
    case "high":
      return "text-neon-amber";
    case "medium":
      return "text-neon-cyan";
    case "low":
      return "text-muted-foreground";
    default: {
      const _exhaustive: never = severity;
      return _exhaustive;
    }
  }
}

export function triageClass(state: TriageState): string {
  switch (state) {
    case "open":
      return "text-neon-amber";
    case "confirmed":
      return "text-neon-red";
    case "reported":
      return "text-neon-cyan";
    case "remediated":
      return "text-neon-green";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

/** Credential keys stored under target.config.vault — never log values. */
export const VAULT_FIELD_KEYS = [
  "apiToken",
  "secretKey",
  "clientId",
  "webhookSecret",
] as const;

export type VaultFieldKey = (typeof VAULT_FIELD_KEYS)[number];

export function readVaultFlags(
  config: Record<string, unknown>
): Record<VaultFieldKey, boolean> {
  const vault =
    config.vault && typeof config.vault === "object" && !Array.isArray(config.vault)
      ? (config.vault as Record<string, unknown>)
      : {};
  return {
    apiToken: typeof vault.apiToken === "string" && vault.apiToken.length > 0,
    secretKey: typeof vault.secretKey === "string" && vault.secretKey.length > 0,
    clientId: typeof vault.clientId === "string" && vault.clientId.length > 0,
    webhookSecret:
      typeof vault.webhookSecret === "string" && vault.webhookSecret.length > 0,
  };
}

export function hasAnyVaultCredentials(
  config: Record<string, unknown>
): boolean {
  const flags = readVaultFlags(config);
  return Object.values(flags).some(Boolean);
}
