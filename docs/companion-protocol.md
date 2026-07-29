# Companion sync protocol

Mirrors [`lib/sync/messages.ts`](../lib/sync/messages.ts) for the native Android companion.

## Transport

| Port | Path | Role |
|------|------|------|
| 3001 | `/sync` | WebSocket signaling |
| 3001 | `/pair/register` | Desktop registers pair token |
| 3001 | `/pair/status/:sessionId` | Pair status |
| 3001 | `/companion/clip/:sessionId` | Clip metadata (GET) |
| 3001 | `/companion/clip/:sessionId/data` | Clip bytes (GET) |
| 3001 | `/companion/clip` | Push clip (POST multipart/json) |
| 3001 | `/companion/inject` | Arm/disarm flag (POST) |
| 3001 | `/companion/findings` | Companion→desktop finding (POST) |

USB lab path:

```bash
npm run adb:reverse
# adb reverse tcp:3001 tcp:3001
# adb reverse tcp:3000 tcp:3000
```

## Pair QR payload

```json
{ "sessionId": "<uuid>", "token": "<token>", "wsUrl": "ws://127.0.0.1:3001/sync" }
```

## Roles / streams

- Desktop initiates `desktop_to_mobile` (synthetic canvas / armed avatar clip).
- Mobile initiates `mobile_to_desktop` (real phone camera).
- Mobile emits `camera_facing` with `user` | `environment`.

## Message `type` discriminator

`pair_request`, `pair_ack`, `camera_facing`, `transform_proposed`, `transform_applied`, `transform_rejected`, `stream_offer`, `stream_answer`, `ice_candidate`, `ping`, `pong`, plus companion extensions:

- `inject_state` — `{ armed, mode }`
- `clip_ready` — `{ clipId, mimeType, byteLength }`
- `finding_signal` — `{ outcome, signals }`

Desktop Zod schema accepts unknown types via extensions in `lib/sync/messages.ts`.

## Virtual camera (Phase B+)

Armed companion writes NV21 frames to `/data/local/tmp/kyc_virtcam.frame`. Magisk module `android/magisk-module` replaces front-camera buffers when `kyc_virtcam.armed` is `1`.
