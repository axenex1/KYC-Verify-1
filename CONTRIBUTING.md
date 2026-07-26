# Contributing to KYC-Verify

This document describes how we decide on, deliver, and maintain feature updates and code implementations for the QA liveness harness.

## Decision process

- Track feature ideas as GitHub Issues using the [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml) (problem, proposed solution, affected areas).
- Triage with labels: `feature`, `enhancement`, `tech-debt`, `provider-integration`.
- Prioritize by impact on the core mission — QA testing of KYC provider liveness integrations:
  1. **Provider coverage** — adapters for additional KYC vendors behind the common provider interface, so new providers are additive.
  2. **Test fidelity** — distortion tools, prompt sets, and simulated behavioral signals covering more real-world failure modes.
  3. **Session replay & analytics** — dashboard and replay depth (export, run comparison, flaky-signal detection).
  4. **Companion/sync robustness** — reconnection handling and error reporting in the WebSocket pairing flow.
  5. **Distribution** — Electron packaging maturity (auto-update, macOS/Linux targets) if the team needs it.

## Delivery workflow

- All changes go through short-lived feature branches and PRs into `main`. One feature per PR, kept small.
- Follow the architectural conventions in the [README](README.md):
  - Session state lives in `lib/session/store.ts` (`sessionStorage`).
  - Preferences live in `lib/preferences/store.ts` (`localStorage`).
  - Ephemeral state (camera, WebRTC, dialogs) stays in React state/refs.
  - **Do not mix session QA payloads with preference keys** — reviewers enforce this.
- New features follow the established module layout: domain logic in `lib/<domain>/`, UI in `components/<domain>/`, routes in `app/`.

## Quality gates

- CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs `npm run lint`, `npm run build` (the type-check gate), and `npm run smoke` on every PR.
- Grow the regression suite in `lib/regression` alongside new features — every provider or liveness feature ships with a regression scenario.
- A dedicated test runner (Vitest for `lib/` logic, Playwright for critical flows such as session creation and capture) will be added once feature velocity justifies it.

## Dependencies

- Dependabot ([.github/dependabot.yml](.github/dependabot.yml)) proposes weekly npm and GitHub Actions updates, gated on the CI build.
- Track breaking changes in `@mediapipe/tasks-vision` and Electron explicitly — they are the riskiest dependencies.

## Review cadence

Revisit prioritization periodically (monthly or per milestone):

- Review what QA testers actually use via the dashboard and audit data.
- Retire unused features.
- Re-rank the backlog against the priority tracks above.
