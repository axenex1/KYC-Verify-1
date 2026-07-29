import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(
  process.env.G0DM0D3_CWD?.trim() || path.join(SERVER_DIR, "..", "..")
);

export const DEFAULT_TIMEOUT_MS =
  Number(process.env.G0DM0D3_TIMEOUT_MS) || 60_000;

const MAX_BUFFER = 10 * 1024 * 1024;

/** Base command names allowed (no free-form shell). */
const DEFAULT_ALLOWLIST = [
  "git",
  "npm",
  "npx",
  "node",
  "tsx",
  "tsc",
  "next",
  "eslint",
  "prettier",
  "pnpm",
  "yarn",
  "bun",
  "where",
  "whoami",
  "hostname",
  "dir",
  "echo",
  "type",
  "rg",
  "findstr",
  "curl",
] as const;

const EXTRA_ALLOWLIST = (process.env.G0DM0D3_ALLOWLIST ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const ALLOWED_COMMANDS = new Set<string>([
  ...DEFAULT_ALLOWLIST,
  ...EXTRA_ALLOWLIST,
]);

export type ExecError = Error & {
  code?: string | number;
  killed?: boolean;
  signal?: NodeJS.Signals | number;
  stdout?: string;
  stderr?: string;
};

export function tokenize(command: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < command.length; i++) {
    const ch = command[i];

    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }

    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += ch;
  }

  if (quote) {
    throw new Error("Unclosed quote in command.");
  }
  if (current) {
    tokens.push(current);
  }
  return tokens;
}

function normalizeCommandName(bin: string): string {
  const base = path.basename(bin).toLowerCase();
  return base.replace(/\.(exe|cmd|bat|ps1)$/i, "");
}

function looksLikePathArg(arg: string): boolean {
  if (arg.startsWith("-")) {
    return false;
  }
  return (
    arg.includes("/") ||
    arg.includes("\\") ||
    arg.includes("..") ||
    path.isAbsolute(arg)
  );
}

function isPathOutsideRepo(candidate: string): boolean {
  const resolved = path.resolve(REPO_ROOT, candidate);
  const root = path.resolve(REPO_ROOT);
  const rel = path.relative(root, resolved);
  return rel.startsWith("..") || path.isAbsolute(rel);
}

function assertSafeArgs(args: string[]): void {
  for (const arg of args) {
    if (/[|&;<>`$]/.test(arg) || arg.includes("\n") || arg.includes("\r")) {
      throw new Error(
        `Argument rejected (shell metacharacters not allowed): ${JSON.stringify(arg)}`
      );
    }
  }
}

async function resolveExecutable(bin: string): Promise<string> {
  if (path.isAbsolute(bin) || bin.includes("/") || bin.includes("\\")) {
    throw new Error(
      "Absolute or relative executable paths are not allowed. Use an allowlisted command name."
    );
  }

  const name = normalizeCommandName(bin);
  if (!ALLOWED_COMMANDS.has(name)) {
    throw new Error(
      `Command "${name}" is not allowlisted. Allowed: ${[...ALLOWED_COMMANDS].sort().join(", ")}`
    );
  }

  if (process.platform === "win32") {
    const { stdout } = await execFileAsync("where.exe", [name], {
      windowsHide: true,
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
    });
    const first = stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find(Boolean);
    if (!first) {
      throw new Error(`Could not resolve executable for "${name}".`);
    }
    return first;
  }

  const { stdout } = await execFileAsync("which", [name], {
    timeout: 10_000,
    maxBuffer: 1024 * 1024,
  });
  const resolved = stdout.trim().split("\n")[0]?.trim();
  if (!resolved) {
    throw new Error(`Could not resolve executable for "${name}".`);
  }
  return resolved;
}

function needsWindowsShell(executable: string): boolean {
  return process.platform === "win32" && /\.(cmd|bat)$/i.test(executable);
}

export function formatExecError(err: ExecError): string {
  const parts: string[] = [];

  if (err.killed || err.signal === "SIGTERM") {
    parts.push(
      `Command timed out after ${DEFAULT_TIMEOUT_MS}ms (cwd: ${REPO_ROOT}).`
    );
  } else if (typeof err.code === "number" || typeof err.code === "string") {
    parts.push(`Command failed with code ${err.code} (cwd: ${REPO_ROOT}).`);
  } else {
    parts.push(`Command failed (cwd: ${REPO_ROOT}).`);
  }

  if (err.message) {
    parts.push(err.message);
  }
  if (err.stderr?.trim()) {
    parts.push(err.stderr.trim());
  }
  if (err.stdout?.trim()) {
    parts.push(err.stdout.trim());
  }

  return parts.filter(Boolean).join("\n");
}

export async function runAllowlistedCommand(command: string): Promise<string> {
  const tokens = tokenize(command.trim());
  if (tokens.length === 0) {
    throw new Error("Empty command.");
  }

  const [bin, ...args] = tokens;
  assertSafeArgs([bin, ...args]);

  for (const arg of args) {
    if (looksLikePathArg(arg) && isPathOutsideRepo(arg)) {
      throw new Error(
        `Path argument escapes locked cwd (${REPO_ROOT}): ${JSON.stringify(arg)}`
      );
    }
  }

  const name = normalizeCommandName(bin);
  if (!ALLOWED_COMMANDS.has(name)) {
    throw new Error(
      `Command "${name}" is not allowlisted. Allowed: ${[...ALLOWED_COMMANDS].sort().join(", ")}`
    );
  }

  if (name === "echo") {
    return args.join(" ") || "";
  }

  if (process.platform === "win32" && (name === "dir" || name === "type")) {
    const { stdout, stderr } = await execFileAsync(
      process.env.ComSpec || "cmd.exe",
      ["/d", "/s", "/c", name, ...args],
      {
        cwd: REPO_ROOT,
        timeout: DEFAULT_TIMEOUT_MS,
        maxBuffer: MAX_BUFFER,
        windowsHide: true,
        shell: false,
        env: process.env,
      }
    );
    const text = [stdout, stderr].filter((s) => s?.trim()).join("\n").trim();
    return text || "Command executed with no output.";
  }

  const executable = await resolveExecutable(bin);
  const { stdout, stderr } = await execFileAsync(executable, args, {
    cwd: REPO_ROOT,
    timeout: DEFAULT_TIMEOUT_MS,
    maxBuffer: MAX_BUFFER,
    windowsHide: true,
    shell: needsWindowsShell(executable),
    env: process.env,
  });

  const text = [stdout, stderr].filter((s) => s?.trim()).join("\n").trim();
  return text || "Command executed with no output.";
}
