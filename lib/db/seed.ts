import type Database from "better-sqlite3";
import type { Target } from "@/types/targets";

const DEFAULT_TARGETS: Omit<Target, "createdAt" | "updatedAt">[] = [
  {
    id: "target-mediapipe-local",
    name: "Local MediaPipe",
    vendor: "mediapipe",
    adapterType: "mediapipe",
    capabilities: ["liveness", "behavioral"],
    config: { note: "Local face/liveness fallback - no vendor credentials" },
    status: "active",
  },
  {
    id: "target-sumsub-sandbox",
    name: "Sumsub Sandbox",
    vendor: "sumsub",
    adapterType: "vendor-sdk",
    capabilities: ["liveness", "document", "sdk"],
    config: { sandbox: true, note: "Stub - configure credentials in Settings" },
    status: "inactive",
  },
  {
    id: "target-onfido-sandbox",
    name: "Onfido Sandbox",
    vendor: "onfido",
    adapterType: "vendor-sdk",
    capabilities: ["liveness", "document", "sdk"],
    config: { sandbox: true, note: "Stub - configure credentials in Settings" },
    status: "inactive",
  },
  {
    id: "target-jumio-sandbox",
    name: "Jumio Sandbox",
    vendor: "jumio",
    adapterType: "vendor-api",
    capabilities: ["liveness", "document"],
    config: { sandbox: true, note: "Stub - configure credentials in Settings" },
    status: "inactive",
  },
  {
    id: "target-veriff-sandbox",
    name: "Veriff Sandbox",
    vendor: "veriff",
    adapterType: "vendor-api",
    capabilities: ["liveness", "document", "behavioral"],
    config: { sandbox: true, note: "Stub - configure credentials in Settings" },
    status: "inactive",
  },
];

export function seedDefaultTargets(db: Database.Database): void {
  const existing = db.prepare("SELECT COUNT(*) AS c FROM targets").get() as {
    c: number;
  };
  if (existing.c > 0) return;

  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO targets (
      id, name, vendor, adapter_type, capabilities, config, status, created_at, updated_at
    ) VALUES (
      @id, @name, @vendor, @adapter_type, @capabilities, @config, @status, @created_at, @updated_at
    )
  `);

  const tx = db.transaction(() => {
    for (const t of DEFAULT_TARGETS) {
      insert.run({
        id: t.id,
        name: t.name,
        vendor: t.vendor,
        adapter_type: t.adapterType,
        capabilities: JSON.stringify(t.capabilities),
        config: JSON.stringify(t.config ?? {}),
        status: t.status,
        created_at: now,
        updated_at: now,
      });
    }
  });

  tx();
}

export { DEFAULT_TARGETS };
