import Database from "better-sqlite3";
import { ensureDbDirectory, getDbPath } from "./path";
import { migrate } from "./schema";
import { seedDefaultTargets } from "./seed";

declare global {
  // eslint-disable-next-line no-var
  var __kycConsoleDb: Database.Database | undefined;
}

function openDatabase(): Database.Database {
  const dbPath = getDbPath();
  ensureDbDirectory(dbPath);

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  seedDefaultTargets(db);
  return db;
}

/**
 * Singleton SQLite connection for Next.js API routes and Node tooling.
 * Survives hot-reload via `globalThis` in development.
 */
export function getDb(): Database.Database {
  if (!globalThis.__kycConsoleDb) {
    globalThis.__kycConsoleDb = openDatabase();
  }
  return globalThis.__kycConsoleDb;
}

export function getDbHealth(): {
  ok: boolean;
  path: string;
  targetCount: number;
} {
  const path = getDbPath();
  try {
    const db = getDb();
    const row = db.prepare("SELECT COUNT(*) AS c FROM targets").get() as {
      c: number;
    };
    return { ok: true, path, targetCount: row.c };
  } catch {
    return { ok: false, path, targetCount: 0 };
  }
}
