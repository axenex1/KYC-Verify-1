---
name: Runway Realtime Avatars
overview: Optionally integrate Runway gwm1_avatars live WebRTC sessions as an alternate live source into the harness outbound path while keeping offline gen4_turbo Document Gen the default.
orchestrate_goal: |
  Implement Plan E for KYC-Verify-1 (authorized lab QA only): optional Runway realtime gwm1_avatars live WebRTC avatar sessions as an alternate live source into harness outbound (desktop_to_mobile / companion inject), while keeping offline gen4_turbo Document Gen (lib/harness/avatar-runway.ts HARNESS_MOTION_MODEL) as the default. Integrate with existing app/api/runway/avatars routes and lib/runway/*; add operator toggle “offline clip (default) | live avatar session”; on session failure fall back to offline path using Plan D recovery patterns. Do not replace or remove gen4_turbo persistent L/R/U/D motion. No Zygisk/Android hook work. Acceptance: operator can start a live avatar session when RUNWAYML_API_SECRET configured and route that stream to the same outbound inject path; default remains offline; lab-owned sandbox framing only.
todos:
  - id: e-avatar-session
    content: Wire gwm1_avatars (or current Runway realtime avatar API) session start/stop via existing avatars routes + client
    status: pending
  - id: e-live-source-toggle
    content: Operator toggle offline gen4_turbo default vs live avatar; persist per engagement
    status: pending
  - id: e-outbound-bridge
    content: Bridge live WebRTC avatar track into harness desktop_to_mobile / NV21 or clip-equivalent outbound
    status: pending
  - id: e-fallback
    content: On live session fail, fall back to offline Document Gen path without breaking pair
    status: pending
  - id: e-docs
    content: Document optional realtime path vs default offline in lab runbook / settings
    status: pending
isProject: true
---

# Plan E — Runway realtime gwm1_avatars

## Goal

Add an **optional** live Runway avatar WebRTC path (`gwm1_avatars` / current Runway realtime avatar product) as an alternate source into the harness outbound inject pipeline. **Offline `gen4_turbo` Document Gen stays the default.**

## Locked defaults

- Default live source: offline persistent L/R/U/D via `gen4_turbo` (`lib/harness/avatar-runway.ts`)
- Optional: realtime avatar session → same companion/outbound path
- Desktop-focused; no Android Zygisk changes
- Branches: build on `pr/5` / `pr/6` (+ Plan D polish if merged)
- Authorized lab QA of owned sandboxes only

## Prerequisites

- Plans A–C functional enough that outbound inject works with offline clips
- Plan D recovery patterns preferred (retry / keep last good / WebRTC reconnect)
- Existing Runway surfaces:
  - `app/api/runway/avatars/route.ts`, `app/api/runway/avatars/[id]/route.ts`
  - `lib/runway/client.ts`, `lib/runway/voices.ts`
  - `components/documents/*` Document Gen UI
- Env: `RUNWAYML_API_SECRET`
- Confirm current Runway SDK method names for realtime avatars at implement time (API may use `gwm1_avatars` or successor — pin documented model id in code constants)

## Architecture

```mermaid
flowchart TB
  Toggle{Live source}
  Toggle -->|default| Offline[gen4_turbo persistent clip]
  Toggle -->|optional| Live[gwm1_avatars WebRTC session]
  Offline --> Out[Harness outbound]
  Live --> Out
  Out --> DT M[desktop_to_mobile]
  Out --> Push[companion clip / frame push]
  Push --> Phone[Companion + VirtCam]
  Live -->|fail| Offline
```

## Concrete implementation steps

1. **API / client**
   - Extend `lib/runway/` with a small realtime avatar session module (create avatar if needed via existing POST `/api/runway/avatars`, start session, obtain WebRTC signaling details per current Runway docs).
   - Centralize model id constant e.g. `HARNESS_REALTIME_AVATAR_MODEL = "gwm1_avatars"` alongside `HARNESS_MOTION_MODEL = "gen4_turbo"`.

2. **Operator toggle**
   - Document Gen / Probe: `offline clip (default)` | `live avatar`.
   - Default always offline; live requires configured secret + successful avatar asset.
   - Persist choice on engagement settings if store exists; otherwise session-local.

3. **Outbound bridge**
   - Feed live avatar video track into existing `desktop_to_mobile` PeerConnection **or** sample frames to the same path used for armed preview (prefer one clear path; document choice).
   - Companion Arm inject continues to use local clip loop when offline; for live mode, either:
     - stream WebRTC frames into companion for `VirtualCamService.pushNv21Frame`, or
     - periodically snapshot to ring — pick the path that reuses `pr/6`/`pr/7` with least new protocol surface.
   - Avoid inventing a second Magisk contract.

4. **Failure fallback**
   - Live session error → toast + auto/manual switch to offline gen4_turbo; keep pair alive (Plan D patterns).
   - Never leave inject armed on a frozen/black live track without operator signal.

5. **Docs**
   - Update lab runbook / settings help: realtime is optional; offline is supported lab baseline.
   - Cost/latency note for operators (realtime vs offline generation).

## Acceptance criteria

- [ ] Default path unchanged: persistent `gen4_turbo` Document Gen → arm → push → inject
- [ ] Optional live avatar session can be started when Runway configured and routed to outbound inject
- [ ] Live failure falls back to offline without unpairing
- [ ] No Zygisk / `android/magisk-module` changes
- [ ] Model ids and env requirements documented
- [ ] Lab-owned sandbox framing only

## Out of scope

- Replacing Magisk interceptor or OEM matrix
- Making realtime the default
- Non-Runway avatar vendors
- Unauthorized testing targets

## Handoff notes (series complete)

- A→E chain: inject binary → fidelity/OEM notes → E2E+runbook → desktop polish → optional realtime.
- Further work (if any) should be new plans: additional OEM devices, more vendor sandboxes (Onfido/Jumio/Veriff), or report export polish — not blockers for A–E acceptance.
