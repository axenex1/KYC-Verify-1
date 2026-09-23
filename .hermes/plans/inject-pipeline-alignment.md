# Inject pipeline alignment

Ideal chain encoded in product:

1. **Arm** — Library/Forge → `sessionStorage` + `POST /api/inject/arm`
2. **Desktop loop** — `/inject` plays blob on canvas + `captureStream` (OBS/virtcam source)
3. **Companion** — optional session → `/controller/[sessionId]` pair (WebRTC desktop_to_mobile)
4. **Zygisk** — optional Magisk module on rooted lab phone (frame ring). Not the injector.

Files:
- `lib/inject/pipeline.ts`
- `lib/inject/loop.ts`
- `app/api/inject/arm/route.ts`
- `components/inject/InjectorStudio.tsx`
- `app/(harness)/inject/page.tsx`

Lab sandboxes only.
