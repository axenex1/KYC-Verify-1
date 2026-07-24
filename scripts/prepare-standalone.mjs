// Copies the static assets and public folder into the Next.js standalone
// output so the bundled server.js can serve them without a CDN.
import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");

if (!existsSync(standalone)) {
  console.error(
    "Missing .next/standalone. Run `next build` with output: 'standalone' first."
  );
  process.exit(1);
}

const copies = [
  {
    from: join(root, ".next", "static"),
    to: join(standalone, ".next", "static"),
  },
  { from: join(root, "public"), to: join(standalone, "public") },
];

for (const { from, to } of copies) {
  if (existsSync(from)) {
    cpSync(from, to, { recursive: true });
    console.log(`Copied ${from} -> ${to}`);
  } else {
    console.warn(`Skipping missing path: ${from}`);
  }
}

console.log("Standalone assets prepared.");
