# KYC-Verify Verification Platform

Desktop-first verification application for identity capture, document review, companion orchestration, and session analytics.

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
npm run build        # Production build (type-check gate)
npm run start
npm run electron:dev # Requires prior build:standalone
npm run dist:win     # Windows NSIS package
```

## Runway AU generation setup

The document tab now includes an **AU Generation Workspace** with:

- Selfie → synthetic Australian driver licence card image
- Australian licence image → avatar portrait

Configure server-side Runway access:

```bash
RUNWAY_API_KEY=your_runway_api_key
# Optional override (default: gen4_image)
RUNWAY_MODEL=gen4_image
```

### Operational limits and behavior

- Accepted input formats: PNG, JPEG, WEBP
- Max input size: 8MB
- Requests are validated server-side and scoped to an existing verification session
- Generation requests use timeout + retry behavior and poll task completion
- Failures return a trace ID for troubleshooting

### Troubleshooting

- `RUNWAY_NOT_CONFIGURED`: missing `RUNWAY_API_KEY`
- `RUNWAY_GENERATION_FAILED`: provider/network error; retry and inspect server logs with trace ID
- `INVALID_IMAGE`: unsupported type or input too large

## Routes

| Path | Purpose |
|------|---------|
| `/` | Create verification or companion session |
| `/verify/[sessionId]` | Verification capture |
| `/controller/[sessionId]` | Desktop companion + document review |
| `/dashboard` | Session analytics |
| `/dev/ui` | Internal component lab |

## UI state layers

1. **Session** — `lib/session/store.ts` → `sessionStorage` key `kyc-verify-session:<id>`
2. **Preferences** — `lib/preferences/store.ts` → `localStorage` key `kyc-verify-preferences`
3. **Ephemeral** — React state/refs for camera, WebRTC, dialogs

Do not mix session payloads with preference keys.
