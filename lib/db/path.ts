import fs from "node:fs";
import path from "node:path";

const DEFAULT_RELATIVE = path.join(".data", "kyc-console.db");

/**
 * Resolve the SQLite database path.
 * Prefer `KYC_CONSOLE_DB_PATH` (set by Electron main under userData).
 * Fall back to `<cwd>/.data/kyc-console.db`.
 */
export function getDbPath(): string {
  const fromEnv = process.env.KYC_CONSOLE_DB_PATH?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }
  return path.resolve(process.cwd(), DEFAULT_RELATIVE);
}

export function ensureDbDirectory(dbPath: string = getDbPath()): void {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
