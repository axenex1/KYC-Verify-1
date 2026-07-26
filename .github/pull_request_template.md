## Summary

<!-- What does this PR change and why? One feature per PR, kept small. -->

## Affected areas

<!-- Check all that apply. -->

- [ ] Harness UI (`app/`, `components/`)
- [ ] Domain logic (`lib/`)
- [ ] API routes (`app/api/`)
- [ ] Sync server (`scripts/sync-server.ts`)
- [ ] Electron packaging (`electron/`)

## Checklist

- [ ] Follows the module layout: domain logic in `lib/<domain>/`, UI in `components/<domain>/`, routes in `app/`
- [ ] Session state stays in `lib/session/store.ts` and preferences in `lib/preferences/store.ts` — no session QA payloads mixed with preference keys
- [ ] Provider or liveness features include a regression scenario in `lib/regression`
- [ ] `npm run lint` and `npm run build` pass locally
