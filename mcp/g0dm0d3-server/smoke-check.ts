/**
 * One-shot hardening checks against the real run-command module.
 * Run: npx tsx mcp/g0dm0d3-server/smoke-check.ts
 */
import {
  REPO_ROOT,
  runAllowlistedCommand,
  tokenize,
} from "./run-command.js";

async function expectReject(command: string, match: RegExp) {
  try {
    await runAllowlistedCommand(command);
    throw new Error(`expected reject for: ${command}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!match.test(message)) {
      throw new Error(
        `reject message mismatch for "${command}": ${message}`
      );
    }
  }
}

async function main() {
  const tokens = tokenize('git commit -m "hi there"');
  if (tokens.join("|") !== "git|commit|-m|hi there") {
    throw new Error(`tokenize failed: ${tokens.join("|")}`);
  }

  const echoed = await runAllowlistedCommand("echo hardened-ok");
  if (echoed !== "hardened-ok") {
    throw new Error(`echo failed: ${echoed}`);
  }

  const status = await runAllowlistedCommand("git rev-parse --show-toplevel");
  const top = status.trim().replace(/\//g, "\\").toLowerCase();
  const expected = REPO_ROOT.replace(/\//g, "\\").toLowerCase();
  if (top !== expected) {
    throw new Error(`cwd mismatch: ${top} !== ${expected}`);
  }

  await expectReject("rm -rf .", /not allowlisted/i);
  await expectReject("echo hello && dir", /metacharacters/i);
  await expectReject("git status | findstr M", /metacharacters/i);

  console.log("smoke-check ok");
  console.log(`repo=${REPO_ROOT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
