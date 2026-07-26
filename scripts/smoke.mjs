/**
 * Lightweight smoke checks for harness routes (no browser required).
 * Run after `npm run build` + `npm run start` or against a running `next start`.
 *
 * Usage: node scripts/smoke.mjs [baseUrl]
 */
const base = process.argv[2] ?? "http://127.0.0.1:3000";

const routes = ["/", "/dashboard", "/prompt-sets", "/dev/ui"];

async function check(path) {
  const res = await fetch(`${base}${path}`, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`${path} → ${res.status}`);
  }
  const html = await res.text();
  if (!html.includes("KYC-Verify") && path !== "/dev/ui") {
    throw new Error(`${path} missing KYC-Verify brand`);
  }
  console.log(`OK ${path} (${res.status})`);
}

async function checkSessionCreate() {
  const res = await fetch(`${base}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "verification", promptSet: "standard" }),
  });
  if (!res.ok) {
    throw new Error(`POST /api/sessions → ${res.status}`);
  }
  const data = await res.json();
  if (!data?.sessionId) {
    throw new Error("POST /api/sessions missing sessionId");
  }
  console.log(`OK POST /api/sessions → ${data.sessionId.slice(0, 8)}…`);

  for (const path of [
    `/verify/${data.sessionId}`,
    `/controller/${data.sessionId}`,
  ]) {
    const page = await fetch(`${base}${path}`);
    if (!page.ok) throw new Error(`${path} → ${page.status}`);
    console.log(`OK ${path}`);
  }
}

async function checkPromptSetsApi() {
  const res = await fetch(`${base}/api/prompt-sets`);
  if (!res.ok) {
    throw new Error(`GET /api/prompt-sets → ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("GET /api/prompt-sets did not return an array");
  }
  console.log(`OK GET /api/prompt-sets (${data.length} sets)`);
}

async function main() {
  for (const route of routes) {
    await check(route);
  }
  await checkSessionCreate();
  await checkPromptSetsApi();
  console.log("\nVERIFIED: harness smoke passed");
}

main().catch((err) => {
  console.error("\nNOT VERIFIED:", err.message);
  process.exit(1);
});
