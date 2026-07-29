# Orchestrate remaining plans (A→E)

Confirm each plan independently, then run `/orchestrate <goal>` using that plan’s `orchestrate_goal` (paste-ready in the file frontmatter).

| Order | Plan file | Purpose |
|-------|-----------|---------|
| **A** | [virtcam_zygisk_inject.plan.md](./virtcam_zygisk_inject.plan.md) | Real Zygisk Camera2 interceptor consuming KYCV frame ring on Pixel |
| **B** | [device_hardening_oem.plan.md](./device_hardening_oem.plan.md) | Profile/IMU/seam fidelity + OEM_MATRIX after Pixel green |
| **C** | [e2e_lab_validation.plan.md](./e2e_lab_validation.plan.md) | Full Document Gen → inject → Open Camera → Sumsub sandbox + runbook |
| **D** | [desktop_operator_polish.plan.md](./desktop_operator_polish.plan.md) | One-button push + armed-state UX + Runway/WebRTC recovery (desktop only) |
| **E** | [runway_realtime_avatars.plan.md](./runway_realtime_avatars.plan.md) | Optional `gwm1_avatars` live source; offline `gen4_turbo` stays default |

## `orchestrate_goal` first sentences

- **A:** Implement Plan A for KYC-Verify-1 (authorized lab QA only): ship a real Zygisk Camera2 ImageReader/HAL buffer-replace interceptor under android/magisk-module/zygisk/ that consumes the existing KYCV frame-ring contract written by MagiskHookBridge/FrameRingWriter to /data/local/tmp/kyc_virtcam.frame when kyc_virtcam.armed is 1.
- **B:** Implement Plan B for KYC-Verify-1 (authorized lab QA only): depends on Plan A working on Pixel — do not start OEM work until Open Camera shows armed KYCV frames on rooted Pixel Magisk.
- **C:** Implement Plan C for KYC-Verify-1 (authorized lab QA only): merge or check out the stacked PRs (prefer working from pr/6-harness-inject-companion + pr/7-android-companion with Plan A zygisk.so and Plan B Pixel hardening if available) and execute the full operator flow — Document Gen persistent L/R/U/D motion, arm clip, desktop_to_mobile, adb reverse (npm run adb:reverse), QR pair, companion Arm inject, prove Open Camera first then Sumsub sandbox on rooted Pixel Magisk.
- **D:** Implement Plan D for KYC-Verify-1 (authorized lab QA only): desktop-only operator polish on top of pr/5–pr/6 Document Gen + harness inject (assume Plan C runbook friction).
- **E:** Implement Plan E for KYC-Verify-1 (authorized lab QA only): optional Runway realtime gwm1_avatars live WebRTC avatar sessions as an alternate live source into harness outbound (desktop_to_mobile / companion inject), while keeping offline gen4_turbo Document Gen (lib/harness/avatar-runway.ts HARNESS_MOTION_MODEL) as the default.

## Locked defaults (all plans)

- Lab device: **Pixel** (rooted Magisk)
- Plan C prove-out: **Open Camera** then **Sumsub sandbox**
- Desktop/android assume `pr/6` + `pr/7` (PRs 3–8); do not reinvent Document Gen stack
- Authorized lab QA of owned KYC stacks only

## Do not edit

- [kyc_pentest_console_redesign_2737cb9b.plan.md](./kyc_pentest_console_redesign_2737cb9b.plan.md) (prior console redesign; leave alone)
