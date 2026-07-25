#!/usr/bin/env node
/**
 * Regression test runner — creates synthetic sessions, submits exports,
 * fetches the dashboard summary, and compares against REGRESSION_BASELINES.
 *
 * Usage:
 *   node scripts/regression.mjs [--base-url http://localhost:3000] [--exit-on-fail]
 *
 * Exit codes:
 *   0 — all baselines met (or insufficient data)
 *   1 — one or more baselines failed
 *   2 — script/network error
 */

import { parseArgs } from "node:util";

// ── CLI args ─────────────────────────────────────────────────────────────────
const { values: args } = parseArgs({
  options: {
    "base-url": { type: "string", default: "http://localhost:3000" },
    "exit-on-fail": { type: "boolean", default: false },
    scenarios: { type: "string", default: "5" },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (args.help) {
  console.log(`
Usage: node scripts/regression.mjs [options]

Options:
  --base-url <url>    Base URL of running app (default: http://localhost:3000)
  --scenarios <n>     Number of synthetic sessions to create (default: 5)
  --exit-on-fail      Exit with code 1 if baselines fail
  -h, --help          Show this help
`);
  process.exit(0);
}

const BASE_URL = args["base-url"];
const SCENARIO_COUNT = Math.max(1, parseInt(args.scenarios ?? "5", 10));
const EXIT_ON_FAIL = args["exit-on-fail"] ?? false;

// ── Regression baselines (mirrored from lib/regression/baselines.ts) ─────────
const BASELINES = {
  minAvgPassRate: 0.8,
  maxAvgDurationMs: 120_000,
  minSessions: 3,
};

// ── Synthetic scenario definitions ───────────────────────────────────────────
const SCENARIOS = [
  { label: "All Pass — high confidence", passRate: 1.0, confidence: 0.95, durationMs: 45_000 },
  { label: "Partial Pass — medium confidence", passRate: 0.8, confidence: 0.75, durationMs: 65_000 },
  { label: "Edge — just below threshold", passRate: 0.75, confidence: 0.6, durationMs: 90_000 },
  { label: "Slow session", passRate: 0.9, confidence: 0.85, durationMs: 110_000 },
  { label: "High confidence partial pass", passRate: 0.83, confidence: 0.88, durationMs: 55_000 },
];

const PROMPT_IDS = [
  "center_face",
  "blink_twice",
  "turn_left",
  "turn_right",
  "smile",
  "hold_still",
];

// ── Utilities ─────────────────────────────────────────────────────────────────
function ok(status) {
  return status >= 200 && status < 300;
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

function buildSyntheticExport(sessionId, scenario) {
  const now = Date.now();
  const createdAt = new Date(now - scenario.durationMs).toISOString();
  const completedAt = new Date(now).toISOString();
  const totalPrompts = PROMPT_IDS.length;
  const passedCount = Math.round(totalPrompts * scenario.passRate);
  const steps = PROMPT_IDS.map((promptId, i) => ({
    promptId,
    promptTitle: promptId.replace(/_/g, " "),
    passed: i < passedCount,
    confidence: scenario.confidence + (Math.random() - 0.5) * 0.05,
    attemptCount: i < passedCount ? 1 : 2,
    durationMs: Math.round((scenario.durationMs / totalPrompts) * (0.8 + Math.random() * 0.4)),
  }));
  const events = [
    { type: "session.started", timestamp: createdAt, label: "Session started", payload: {} },
    ...steps.map((step, i) => ({
      type: step.passed ? "prompt.passed" : "prompt.failed",
      timestamp: new Date(
        new Date(createdAt).getTime() + (i + 1) * (scenario.durationMs / (totalPrompts + 1))
      ).toISOString(),
      label: `${step.promptTitle}: ${step.passed ? "passed" : "failed"}`,
      payload: { promptId: step.promptId, confidence: step.confidence },
    })),
    { type: "session.completed", timestamp: completedAt, label: "Session completed", payload: {} },
  ];

  return {
    sessionId,
    createdAt,
    completedAt,
    passedCount,
    failedCount: totalPrompts - passedCount,
    totalPrompts,
    promptSet: "standard",
    steps,
    events,
    device: { platform: "regression-synthetic", userAgent: "regression-script/1.0" },
    backgroundMode: "none",
    distortionMode: "none",
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log(`\n🔬 KYC Regression Suite`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Scenarios: ${SCENARIO_COUNT}\n`);

  const scenariosToRun = [];
  for (let i = 0; i < SCENARIO_COUNT; i++) {
    scenariosToRun.push(SCENARIOS[i % SCENARIOS.length]);
  }

  const sessionIds = [];

  // 1. Create synthetic sessions
  console.log("── Creating synthetic sessions ──────────────────────");
  for (const scenario of scenariosToRun) {
    const { status, body } = await apiFetch("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ source: "regression-script" }),
    });
    if (!ok(status)) {
      console.error(`  ✗ Failed to create session: HTTP ${status}`, body);
      process.exit(2);
    }
    const sessionId = body.sessionId ?? body.id;
    if (!sessionId) {
      console.error(`  ✗ No sessionId in response`, body);
      process.exit(2);
    }
    sessionIds.push({ sessionId, scenario });
    console.log(`  ✓ Created session ${sessionId} — "${scenario.label}"`);
  }

  // 2. Submit synthetic exports
  console.log("\n── Submitting exports ───────────────────────────────");
  for (const { sessionId, scenario } of sessionIds) {
    const exportData = buildSyntheticExport(sessionId, scenario);
    const { status, body } = await apiFetch(`/api/sessions/${sessionId}/export`, {
      method: "POST",
      body: JSON.stringify(exportData),
    });
    if (!ok(status)) {
      console.error(`  ✗ Export failed for ${sessionId}: HTTP ${status}`, body);
      process.exit(2);
    }
    const passRate = Math.round(scenario.passRate * 100);
    console.log(`  ✓ Exported ${sessionId} — ${passRate}% pass rate`);
  }

  // 3. Fetch dashboard summary
  console.log("\n── Fetching dashboard summary ───────────────────────");
  const { status: summaryStatus, body: summary } = await apiFetch(
    "/api/dashboard/summary"
  );
  if (!ok(summaryStatus)) {
    console.error(`  ✗ Dashboard fetch failed: HTTP ${summaryStatus}`, summary);
    process.exit(2);
  }
  console.log(
    `  ✓ Summary: ${summary.completedSessions} completed sessions, ${Math.round(summary.avgPassRate * 100)}% avg pass rate`
  );

  // 4. Evaluate regression checks
  console.log("\n── Regression checks ────────────────────────────────");
  const regression = summary.regression;
  if (!regression) {
    console.error("  ✗ No regression data in dashboard summary");
    process.exit(2);
  }

  if (!regression.sufficientData) {
    console.log(
      `  ⚠  Insufficient data: ${regression.sessionCount}/${BASELINES.minSessions} sessions. Skipping baseline check.`
    );
  } else {
    for (const check of regression.checks) {
      const status = check.passed ? "✓" : "✗";
      const valueStr =
        check.unit === "%"
          ? `${Math.round(check.value * 100)}%`
          : check.unit === "ms"
          ? `${(check.value / 1000).toFixed(1)}s`
          : String(check.value);
      const thresholdStr =
        check.unit === "%"
          ? `${Math.round(check.threshold * 100)}%`
          : check.unit === "ms"
          ? `${(check.threshold / 1000).toFixed(1)}s`
          : String(check.threshold);
      console.log(
        `  ${status} ${check.name}: ${valueStr} (threshold: ${thresholdStr})`
      );
    }
  }

  // 5. Machine-readable output
  const result = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    scenariosRun: scenariosToRun.length,
    regression,
  };
  console.log("\n── Machine-readable result ──────────────────────────");
  console.log(JSON.stringify(result, null, 2));

  // 6. Exit
  const failed = regression.sufficientData && !regression.meetsBaseline;
  if (failed) {
    console.error("\n❌ Regression baselines NOT met.\n");
    if (EXIT_ON_FAIL) process.exit(1);
  } else {
    console.log(
      `\n✅ Regression ${regression.sufficientData ? "PASSED" : "skipped (insufficient data)"}.\n`
    );
  }
  process.exit(0);
}

run().catch((err) => {
  console.error("Regression script error:", err);
  process.exit(2);
});
