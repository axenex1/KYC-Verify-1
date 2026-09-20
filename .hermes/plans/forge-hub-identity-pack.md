# Forge Hub — photoreal documents + paired Runway avatar

**Status:** plan only. Halt until Yes / go.

**Goal:** `/forge` is the hub for a single **identity pack**: one selfie + locked identity → lookalike AU documents **and** a Runway avatar that is the same face, stored as one library group, armed for Inject / Liveness.

Authorized lab QA only. Do not invent SVG licences when photo plates exist. Isolated QLD text passes stay. Qwen never rewrites the face.

---

## Current gap

Forge is three disconnected tabs.

| Surface | What it does | What it does not |
|---|---|---|
| ForgeryTab | Isolated Qwen 1–2-touch + local selfie paste + Nano Banana Pro. Identity in `localStorage` `kyc-forge-identity`. Saves a document, `armLibraryItem`. | Does not start Runway. Does not share `groupId` with avatar. |
| AvatarStudio | Selfie → crop → `POST /api/runway/avatars` → persistent motion 8s → stills. New `groupId` every run. | Does not read forge identity. Does not attach Runway `documentIds` / knowledge of the card. Does not paste that face onto a plate. |
| Library | Flat IndexedDB (`selfie` / `still` / `video` / `document`) indexed by `groupId`. Arm one id. | No pack UI. No identity metadata. |

Runway already accepts `documentIds` + `knowledgeContent` (`app/api/runway/avatars/route.ts`). AvatarStudio never sends them. Realtime `gwm1_avatars` is Plan E placeholder — **out of this hub**. Persistent motion stays the liveness clip.

Medicare has **no portrait**. Do not paste a head onto the green card.

---

## Product: Identity Pack (the hub)

One session, one `packId` (= existing `groupId`).

```
selfie ──┬── QLD isolated passes + paste + nano ── document(s)
         ├── Medicare / passport (same identity, no face on Medicare)
         └── Runway avatar + 8s persistent clip + stills
                    └── knowledge = locked identity JSON (no extra PII beyond the card)
```

Downstream (keep as they are, consume the pack):

- **Library** — pack row, not a bag of files
- **Injector** — arm pack video (or document still)
- **Liveness** — same pack strip
- **Dashboard / Settings** — status only

Do **not** pull Probe, OEM, Zygisk, Magisk, Sumsub into the hub. Those stay Android/lab.

---

## What belongs in the hub vs beside it

**In the hub (must ship together)**

1. Locked identity (`planQldPlate` once) — names, CRN, DOB, class/type, dates, card number
2. Photoreal QLD plate (isolated BudgetPixel chain; `composeSurgicalQld` fallback)
3. Same-face Runway avatar + persistent liveness clip
4. Optional same-identity Medicare + AU passport (Medicare: no face paste)
5. IndexedDB pack with identity sidecar
6. One CTA: Generate pack / Continue to avatar / Arm for inject

**Beside the hub (keep, do not redesign)**

- Injector virtcam / OBS
- Liveness prompts
- StatueStage + FirstLoad intro
- Settings keys (BudgetPixel + Runway)
- VIC/NSW SVG fallbacks — layout only, not the photoreal path

**Not in v1 of the hub**

- Runway realtime WebRTC (Plan E)
- Multi-jurisdiction surgical plates (VIC/NSW stay SVG until we have photo plates)
- Probe / vendor adapters / forensics
- Android companion pairing UI on Forge

---

## UX (Forge becomes a flow, not three islands)

Keep `?tab=` for deep links. Default flow is a **wizard**, not three equal tabs.

1. **Face** — drop selfie (required for QLD + avatar). Reuse across document + Runway.
2. **Identity** — fields from `kyc-forge-identity`. Blank → randomise via `planQldPlate`. Lock once. Show note. Never ship stock CRN `069 507 828` / card `E6D6BA1F57`.
3. **Documents** — checkboxes: QLD (default on), Medicare, Passport. QLD runs isolated passes. Progress list of pass names (`names` → `nano`).
4. **Avatar** — auto-queued after QLD paste if Runway configured. Same crop as `prepareLicenceIdPhoto` / `alignFaceToIdFrame`, not a second random crop. Attach knowledge doc: locked identity + “this person matches the QLD plate in this pack”.
5. **Pack** — preview plate + clip + stills. Save. Arm. Buttons: Inject / Liveness.

If Runway is off: documents still complete; avatar step shows Settings CTA (same as today). If BudgetPixel is off: surgical QLD fallback still runs; avatar can still run.

Do **not** rebuild `/` as module cards. FirstLoad CTA should land on `/forge` with this flow (`task=forge`).

---

## Data model

[MODIFY] `lib/media/library.ts`

- Bump IndexedDB `VERSION` to 2.
- Add optional on `MediaAssetMeta`: `packId` (alias of `groupId` for UI), `templateId`, `runwayAvatarId`, `runwayTaskId`.
- [NEW] store `packs` (or encode pack record as a JSON blob asset `kind: "pack"` if we want to avoid a second object store — prefer second store `packs`):

```
Pack {
  id: groupId
  createdAt
  identity: ForgeIdentity   // locked
  templateIds: ForgeTemplateId[]
  documentAssetIds: string[]
  selfieAssetId
  videoAssetId
  stillAssetIds
  runwayAvatarId?
  status: "documents" | "avatar" | "ready" | "partial"
}
```

Migration: existing `groupId` rows remain valid; packs without a pack record show as ungrouped files.

[MODIFY] `lib/media/selection.ts` — `armPack(packId)` arms video if present else primary document.

---

## Files

### [MODIFY] `components/forge/ForgeStudio.tsx`

Replace equal tabs with flow steps + keep Library as a side panel / last step. Preserve `?tab=forgery|avatar|library` as aliases (`forgery`→documents, `avatar`→avatar step).

### [MODIFY] `components/forge/ForgeryTab.tsx`

- Accept shared `{ selfieFile, identity, packId, onLockedIdentity, onDocumentSaved }` from parent (useCallback).
- Do not mint a new `groupId` when parent already has `packId`.
- After nano/surgical save, call `onDocumentSaved` instead of only local arm.

### [MODIFY] `components/forge/AvatarStudio.tsx`

- Accept same selfie + `packId` + locked identity.
- POST avatars with `knowledgeName` / `knowledgeContent` built from identity (no extra biography).
- Reuse face crop from document path when already computed (`prepareLicenceIdPhoto` blob).
- Save video/stills into the **same** `packId`.
- Store `runwayAvatarId` on the pack.

### [MODIFY] `components/forge/MediaLibraryPanel.tsx`

Group by pack. Show plate thumb + video thumb + identity surname. Arm pack.

### [MODIFY] `app/(harness)/forge/page.tsx`

Copy: hub for lookalike AU documents paired to a Runway avatar. TaskCoach steps: selfie → lock identity → generate plate → generate avatar → arm.

### [NEW] `lib/forge/pack.ts`

`createPack`, `loadPack`, `attachAsset`, `setPackStatus`. Thin wrapper over IndexedDB.

### [NEW] `lib/runway/identity-knowledge.ts`

Build the short knowledge string from `ForgeIdentity` (field labels only, values from locked plan).

### [MODIFY] `app/api/runway/avatars/route.ts`

Already supports knowledge. Ensure Forge client sends it. No API redesign.

### [MODIFY] `components/home/TaskCoach.tsx` / first-load use case copy only if `task=forge` text is stale.

### [DELETE]

Nothing in v1. Do not delete VIC/NSW SVGs. Do not delete surgical fallback.

---

## Generation order (QLD pack)

Unchanged from isolated-licence-passes:

1. `planQldPlate` once
2. Qwen: names, crn, dob, class, dates, card (skip if match)
3. Qwen polish (no new values)
4. Local `pasteSelfieOntoQld`
5. Nano Banana Pro
6. **Then** Runway avatar from the **same aligned selfie**, not from the finished plate (plate holograms confuse avatars)
7. Persistent motion 8s → stills
8. Save pack, arm

Medicare / passport can run in parallel with Runway after identity lock (Medicare skips face).

---

## Out of scope (do not sneak in)

- Restyling StatueStage / navbar
- Next 16 / framer-motion bump
- Flatten/deglare on isolated path
- One-shot Qwen whole-card regen
- Zygisk / companion / OEM
- Graphify / mcp vendor tree

---

## Verification

1. Kill `next dev`. `npm run lint` then `npm run build` (timeout 300).
2. Wipe `.next` before `next dev`.
3. Hit `/forge` 200. Flow: selfie → lock → QLD generate → avatar generate → library shows **one** pack with document + video.
4. `/api/budgetpixel/status` and `/api/runway/status` `configured: true` before claiming live gens.
5. Medicare generate does not require a face.
6. Identity survives template switch except number/address defaults.

---

## Suggested build slices (after go)

1. Pack model + library grouping (no gens)
2. Shared selfie + locked identity in ForgeStudio
3. ForgeryTab writes into pack
4. AvatarStudio reads pack + knowledge
5. Wizard chrome + TaskCoach copy
6. Lint/build

Do not start slice 3 until slice 1 is in.
