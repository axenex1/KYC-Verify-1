/**
 * Lightweight smoke checks for KYC_BREACH//CONSOLE routes (no browser required).
 * Run after `npm run build` + `npm run start` or against a running `next start` / `next dev`.
 *
 * Usage: node scripts/smoke.mjs [baseUrl]
 */
const base = process.argv[2] ?? "http://127.0.0.1:3000";
const FETCH_MS = 20_000;

const routes = [
  "/",
  "/targets",
  "/engagements/new",
  "/vectors",
  "/findings",
  "/operator",
  "/settings",
  "/dev/ui",
];

function timeoutSignal(ms = FETCH_MS) {
  return AbortSignal.timeout(ms);
}

function hasConsoleBrand(html) {
  return (
    html.includes("KYC_BREACH") ||
    html.includes("//CONSOLE") ||
    html.includes("KYC Console") ||
    /\bKYC\b/.test(html)
  );
}

async function check(path) {
  const res = await fetch(`${base}${path}`, {
    redirect: "follow",
    signal: timeoutSignal(),
  });
  if (!res.ok) {
    throw new Error(`${path} → ${res.status}`);
  }
  const html = await res.text();
  if (!hasConsoleBrand(html) && path !== "/dev/ui") {
    throw new Error(`${path} missing console brand (KYC_BREACH / KYC)`);
  }
  console.log(`OK ${path} (${res.status})`);
}

async function checkSessionCreate() {
  const res = await fetch(`${base}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "qa", promptSet: "standard" }),
    signal: timeoutSignal(),
  });
  if (!res.ok) {
    throw new Error(`POST /api/sessions → ${res.status}`);
  }
  const data = await res.json();
  if (!data?.sessionId) {
    throw new Error("POST /api/sessions missing sessionId");
  }
  console.log(`OK POST /api/sessions → ${data.sessionId.slice(0, 8)}…`);
}

async function resolveTargetId() {
  const listRes = await fetch(`${base}/api/targets`, {
    signal: timeoutSignal(),
  });
  if (!listRes.ok) {
    throw new Error(`GET /api/targets → ${listRes.status}`);
  }
  const list = await listRes.json();
  const existing = list?.targets?.[0]?.id;
  if (existing) return existing;

  const createRes = await fetch(`${base}/api/targets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Smoke MediaPipe",
      vendor: "mediapipe",
      adapterType: "mediapipe",
      capabilities: ["liveness"],
      status: "active",
    }),
    signal: timeoutSignal(),
  });
  if (!createRes.ok) {
    throw new Error(`POST /api/targets → ${createRes.status}`);
  }
  const created = await createRes.json();
  if (!created?.target?.id) {
    throw new Error("POST /api/targets missing target.id");
  }
  console.log(`OK POST /api/targets → ${created.target.id}`);
  return created.target.id;
}

async function checkEngagementFlow() {
  const targetId = await resolveTargetId();
  console.log(`OK targetId → ${targetId}`);

  const res = await fetch(`${base}/api/engagements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      targetId,
      name: "Smoke engagement",
      attackSurface: ["liveness"],
      vectorPayloads: [{ kind: "deepfake", config: {} }],
      status: "active",
      operatorName: "smoke-operator",
      authorizationRef: "SMOKE-AUTH-001",
    }),
    signal: timeoutSignal(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`POST /api/engagements → ${res.status} ${body}`);
  }
  const data = await res.json();
  const engagementId = data?.engagement?.id;
  if (!engagementId) {
    throw new Error("POST /api/engagements missing engagement.id");
  }
  console.log(`OK POST /api/engagements → ${engagementId.slice(0, 8)}…`);

  for (const path of [
    `/engagements/${engagementId}`,
    `/engagements/${engagementId}/probe`,
    `/engagements/${engagementId}/pair`,
  ]) {
    const page = await fetch(`${base}${path}`, { signal: timeoutSignal() });
    if (!page.ok) throw new Error(`${path} → ${page.status}`);
    console.log(`OK ${path}`);
  }

  const report = await fetch(
    `${base}/api/engagements/${engagementId}/report?format=json`,
    { signal: timeoutSignal() }
  );
  if (!report.ok) {
    throw new Error(`GET report → ${report.status}`);
  }
  console.log(`OK GET /api/engagements/.../report`);
}

async function checkRunwayStatus() {
  const res = await fetch(`${base}/api/runway/status`, {
    signal: timeoutSignal(),
  });
  if (!res.ok) {
    throw new Error(`GET /api/runway/status → ${res.status}`);
  }
  const data = await res.json();
  if (typeof data?.configured !== "boolean") {
    throw new Error("GET /api/runway/status missing configured");
  }
  console.log(
    `OK GET /api/runway/status (configured=${data.configured})`
  );

  const motion = await fetch(`${base}/api/runway/motion`, {
    method: "POST",
    body: new FormData(),
    signal: timeoutSignal(),
  });
  // Unconfigured → 503; configured without file → 400.
  if (![400, 503].includes(motion.status)) {
    throw new Error(`POST /api/runway/motion → ${motion.status}`);
  }
  console.log(`OK POST /api/runway/motion (guard=${motion.status})`);

  const task = await fetch(`${base}/api/runway/tasks/smoke-probe`, {
    signal: timeoutSignal(),
  });
  if (![404, 502, 503].includes(task.status)) {
    throw new Error(`GET /api/runway/tasks/... → ${task.status}`);
  }
  console.log(`OK GET /api/runway/tasks/... (guard=${task.status})`);
}

async function main() {
  for (const route of routes) {
    await check(route);
  }
  await checkSessionCreate();
  await checkEngagementFlow();
  await checkRunwayStatus();
  console.log("\nVERIFIED: console smoke passed");
}

main().catch((err) => {
  console.error("\nNOT VERIFIED:", err.message);
  process.exit(1);
});
