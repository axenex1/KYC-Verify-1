# KYC-Verify QA Liveness Harness

Desktop-first internal QA tool for testing KYC provider liveness integrations with simulated behavioral signals.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v3 + shadcn/ui (Radix) + next-themes
- Zustand session store (`sessionStorage`) + preferences (`localStorage`)
- MediaPipe face landmarking, WebRTC companion sync, Electron packaging

## Scripts

```bash
npm install
npm run dev          # Next.js UI
npm run dev:sync     # WebSocket pairing server (:3001)
npm run dev:all      # UI + sync together
npm run ai:code -- "generate a zod schema for session export"
npm run build        # Production build (type-check gate)
npm run start
npm run electron:dev # Requires prior build:standalone
npm run dist:win     # Windows NSIS package
```

## g0dm0d3.ai coding API

Use the OpenAI-compatible endpoint from this repo:

```bash
export GODMODE_API_BASE_URL="https://your-g0dm0d3-host"
export GODMODE_API_KEY="your_api_key"
export GODMODE_MODEL="your_model_id"
npm run ai:code -- "create a TypeScript utility for retry with backoff"
```

The script calls `POST /v1/chat/completions` with your prompt and prints the model output to stdout.

## Routes

| Path | Purpose |
|------|---------|
| `/` | Create QA or companion session |
| `/verify/[sessionId]` | Liveness capture |
| `/controller/[sessionId]` | Desktop companion + document QA |
| `/dashboard` | Session analytics |
| `/dev/ui` | Internal component lab |

## UI state layers

1. **Session** — `lib/session/store.ts` → `sessionStorage` key `kyc-verify-session:<id>`
2. **Preferences** — `lib/preferences/store.ts` → `localStorage` key `kyc-verify-preferences`
3. **Ephemeral** — React state/refs for camera, WebRTC, dialogs

Do not mix session QA payloads with preference keys.
