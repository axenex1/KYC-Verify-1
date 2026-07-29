import type Database from "better-sqlite3";

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS targets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  vendor TEXT NOT NULL,
  adapter_type TEXT NOT NULL,
  capabilities TEXT NOT NULL DEFAULT '[]',
  config TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS engagements (
  id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,
  name TEXT,
  attack_surface TEXT NOT NULL DEFAULT '[]',
  vector_payloads TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  operator_name TEXT,
  authorization_ref TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (target_id) REFERENCES targets(id)
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  environment TEXT NOT NULL DEFAULT 'qa',
  prompt_set TEXT NOT NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  export_json TEXT,
  engagement_id TEXT,
  target_id TEXT,
  vector_payload TEXT,
  target_verdict TEXT,
  findings_json TEXT
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL,
  session_id TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  vector_payload TEXT,
  target_verdict TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (engagement_id) REFERENCES engagements(id)
);

CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  engagement_id TEXT,
  run_id TEXT,
  target_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL,
  vector TEXT,
  triage_state TEXT NOT NULL DEFAULT 'open',
  evidence TEXT NOT NULL DEFAULT '{}',
  repro_steps TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  engagement_id TEXT,
  run_id TEXT,
  type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  payload TEXT
);

CREATE INDEX IF NOT EXISTS idx_engagements_target ON engagements(target_id);
CREATE INDEX IF NOT EXISTS idx_engagements_status ON engagements(status);
CREATE INDEX IF NOT EXISTS idx_findings_triage ON findings(triage_state);
CREATE INDEX IF NOT EXISTS idx_findings_engagement ON findings(engagement_id);
CREATE INDEX IF NOT EXISTS idx_findings_target ON findings(target_id);
CREATE INDEX IF NOT EXISTS idx_runs_engagement ON runs(engagement_id);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);
`;

export function migrate(db: Database.Database): void {
  db.exec(SCHEMA_SQL);

  // Additive columns for existing DBs created before auth framing fields.
  const cols = (
    db.prepare("PRAGMA table_info(engagements)").all() as { name: string }[]
  ).map((c) => c.name);
  if (!cols.includes("operator_name")) {
    db.exec("ALTER TABLE engagements ADD COLUMN operator_name TEXT");
  }
  if (!cols.includes("authorization_ref")) {
    db.exec("ALTER TABLE engagements ADD COLUMN authorization_ref TEXT");
  }
}
