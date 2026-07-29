import { randomUUID } from "node:crypto";
import { getDb } from "./client";
import type {
  CreateTargetInput,
  Target,
  TargetCapability,
  TargetStatus,
  TargetVendor,
  TargetAdapterType,
  UpdateTargetInput,
} from "@/types/targets";

interface TargetRow {
  id: string;
  name: string;
  vendor: string;
  adapter_type: string;
  capabilities: string;
  config: string;
  status: string;
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

function rowToTarget(row: TargetRow): Target {
  return {
    id: row.id,
    name: row.name,
    vendor: row.vendor as TargetVendor,
    adapterType: row.adapter_type as TargetAdapterType,
    capabilities: parseJson<TargetCapability[]>(row.capabilities, []),
    config: parseJson<Record<string, unknown>>(row.config, {}),
    status: row.status as TargetStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listTargets(): Target[] {
  const rows = getDb()
    .prepare("SELECT * FROM targets ORDER BY name ASC")
    .all() as TargetRow[];
  return rows.map(rowToTarget);
}

export function getTarget(id: string): Target | undefined {
  const row = getDb()
    .prepare("SELECT * FROM targets WHERE id = ?")
    .get(id) as TargetRow | undefined;
  return row ? rowToTarget(row) : undefined;
}

export function upsertTarget(input: CreateTargetInput): Target {
  const now = new Date().toISOString();
  const id = input.id ?? randomUUID();
  const existing = getTarget(id);

  if (existing) {
    const updated: Target = {
      ...existing,
      name: input.name,
      vendor: input.vendor,
      adapterType: input.adapterType,
      capabilities: input.capabilities ?? existing.capabilities,
      config: input.config ?? existing.config,
      status: input.status ?? existing.status,
      updatedAt: now,
    };
    getDb()
      .prepare(
        `UPDATE targets SET
          name = @name,
          vendor = @vendor,
          adapter_type = @adapter_type,
          capabilities = @capabilities,
          config = @config,
          status = @status,
          updated_at = @updated_at
        WHERE id = @id`
      )
      .run({
        id: updated.id,
        name: updated.name,
        vendor: updated.vendor,
        adapter_type: updated.adapterType,
        capabilities: JSON.stringify(updated.capabilities),
        config: JSON.stringify(updated.config ?? {}),
        status: updated.status,
        updated_at: updated.updatedAt,
      });
    return updated;
  }

  const created: Target = {
    id,
    name: input.name,
    vendor: input.vendor,
    adapterType: input.adapterType,
    capabilities: input.capabilities ?? [],
    config: input.config ?? {},
    status: input.status ?? "active",
    createdAt: now,
    updatedAt: now,
  };

  getDb()
    .prepare(
      `INSERT INTO targets (
        id, name, vendor, adapter_type, capabilities, config, status, created_at, updated_at
      ) VALUES (
        @id, @name, @vendor, @adapter_type, @capabilities, @config, @status, @created_at, @updated_at
      )`
    )
    .run({
      id: created.id,
      name: created.name,
      vendor: created.vendor,
      adapter_type: created.adapterType,
      capabilities: JSON.stringify(created.capabilities),
      config: JSON.stringify(created.config ?? {}),
      status: created.status,
      created_at: created.createdAt,
      updated_at: created.updatedAt,
    });

  return created;
}

export function updateTarget(
  id: string,
  patch: UpdateTargetInput
): Target | undefined {
  const existing = getTarget(id);
  if (!existing) return undefined;

  const updated: Target = {
    ...existing,
    name: patch.name ?? existing.name,
    vendor: patch.vendor ?? existing.vendor,
    adapterType: patch.adapterType ?? existing.adapterType,
    capabilities: patch.capabilities ?? existing.capabilities,
    config: patch.config ?? existing.config,
    status: patch.status ?? existing.status,
    updatedAt: new Date().toISOString(),
  };

  getDb()
    .prepare(
      `UPDATE targets SET
        name = @name,
        vendor = @vendor,
        adapter_type = @adapter_type,
        capabilities = @capabilities,
        config = @config,
        status = @status,
        updated_at = @updated_at
      WHERE id = @id`
    )
    .run({
      id: updated.id,
      name: updated.name,
      vendor: updated.vendor,
      adapter_type: updated.adapterType,
      capabilities: JSON.stringify(updated.capabilities),
      config: JSON.stringify(updated.config ?? {}),
      status: updated.status,
      updated_at: updated.updatedAt,
    });

  return updated;
}

export function deleteTarget(id: string): boolean {
  const result = getDb().prepare("DELETE FROM targets WHERE id = ?").run(id);
  return result.changes > 0;
}
