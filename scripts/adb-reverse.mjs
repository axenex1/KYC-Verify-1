#!/usr/bin/env node
/**
 * Reverse USB ports so the Android companion can reach desktop sync + Next.
 * Usage: npm run adb:reverse
 */
const { execSync } = require("node:child_process");

const ports = [3001, 3000, 3002];

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

try {
  run("adb devices");
  for (const port of ports) {
    run(`adb reverse tcp:${port} tcp:${port}`);
  }
  console.log("adb reverse ready (3001 sync/ws+clip, 3000 next, 3002 reserved)");
} catch (err) {
  console.error(
    "adb reverse failed. Install platform-tools and connect a lab device via USB."
  );
  process.exitCode = 1;
}
