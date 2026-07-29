# KYC_BREACH//CONSOLE

Authorized **KYC Breach Console** — an Electron desktop pentest console for red-team/QA operators at crypto trading establishments. Probe your own deployed KYC vendor stacks (Sumsub, Onfido, Jumio, Veriff sandboxes) plus a local MediaPipe fallback target for fraudulent signup loopholes, then triage findings into remediation reports.

## Stack

- Next.js (App Router) + TypeScript + Electron
- Tailwind CSS + shadcn/ui + JetBrains Mono console chrome
- SQLite (`better-sqlite3`) persistence
- MediaPipe face landmarking, WebRTC companion sync, pluggable target adapters

## Scripts

```bash
npm install
npm run dev          # Next.js UI
npm run dev:sync     # WebSocket pairing server (:3001)
npm run dev:all      # UI + sync together
npm run adb:reverse  # USB reverse 3000/3001 for Android companion
npm run build
npm run smoke        # HTTP smoke against a running server
npm run mcp:console  # Locked-down MCP command runner
npm run electron:dev # Requires prior build:standalone
npm run dist:win     # Windows NSIS package
```

## Android companion

Native Kotlin companion lives in [`android/`](android/). Pair via QR on
`/engagements/[id]/pair`, push an armed Document Gen clip, then Arm inject on
a rooted lab phone with the Magisk virtcam module. Protocol:
[`docs/companion-protocol.md`](docs/companion-protocol.md).

## Operator scopes

| Path | Purpose |
|------|---------|
| `/` | Mission Control |
| `/targets` | Target Registry |
| `/engagements/new` | Engagement Setup |
| `/engagements/[id]/probe` | Live Probe Run |
| `/engagements/[id]/probe/[runId]` | Probe Run (pinned run) |
| `/engagements/[id]/runs/[runId]` | Forensics / Run Replay |
| `/engagements/[id]/pair` | Companion Pair |
| `/vectors` | Vector Library |
| `/findings` | Findings Triage Board |
| `/operator` | Operator Settings (credential vault, MCP, theme) |
| `/dev/ui` | Component lab |

## Document Generation (Runway)

Inside a Live Probe capture session, open the **Document Gen** tab to upload a license/ID scan. The console crops the portrait photo, creates a Runway avatar from that face, then exposes head-tilt controls with a live preview and saveable motion video.

1. Copy `.env.example` → `.env`
2. Set `RUNWAYML_API_SECRET` from [dev.runwayml.com](https://dev.runwayml.com/)
3. Restart `npm run dev:all`
4. Start a probe → **Document Gen** → upload license → wait for face crop → **Create avatar** / adjust tilt → **Generate video** or **Save live clip**

The API key stays server-side. Avatar id, crop flag, motion URL, and status are audited into the session export.

## Legal framing

Every screen shows an **AUTHORIZED ENGAGEMENT** badge. Engagement setup requires an operator name and authorization reference. Use only against systems you are authorized to test.
