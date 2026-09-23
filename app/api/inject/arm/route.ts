import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

/**
 * Lab arm endpoint — records which media id the operator selected.
 * Does not push frames to phone cameras or production KYC vendors.
 * Client still owns IndexedDB blobs; this is operator/session metadata.
 */

const BodySchema = z.object({
  assetId: z.string().min(1).max(120),
  packId: z.string().min(1).max(120).optional().nullable(),
  kind: z.enum(["video", "document", "still", "selfie", "unknown"]).default("unknown"),
  label: z.string().max(200).optional(),
  mimeType: z.string().max(120).optional(),
  source: z.enum(["library", "forge", "api"]).default("library"),
});

// In-memory lab arm table (process-local). Fine for single-operator desktop.
const armedBySession = new Map<
  string,
  {
    assetId: string;
    packId?: string | null;
    kind: string;
    label: string;
    mimeType: string;
    source: string;
    armedAt: string;
  }
>();

function sessionKey(request: Request): string {
  return request.headers.get("x-kyc-operator") || "local-operator";
}

export async function GET(request: Request) {
  const key = sessionKey(request);
  const armed = armedBySession.get(key) ?? null;
  return NextResponse.json({
    labOnly: true,
    pipeline: ["arm", "desktop_loop", "companion", "zygisk"],
    note: "Zygisk is optional phone HAL hook, not the injector.",
    armed,
  });
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = BodySchema.parse(json);
    const key = sessionKey(request);
    const record = {
      assetId: body.assetId,
      packId: body.packId ?? null,
      kind: body.kind,
      label: body.label || body.assetId,
      mimeType: body.mimeType || "application/octet-stream",
      source: body.source,
      armedAt: new Date().toISOString(),
    };
    armedBySession.set(key, record);
    return NextResponse.json({
      ok: true,
      labOnly: true,
      armed: record,
      next: "/inject?source=library",
      stages: {
        arm: "ready",
        desktop_loop: "ready",
        companion: "optional",
        zygisk: "optional",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid arm payload", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Arm failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const key = sessionKey(request);
  armedBySession.delete(key);
  return NextResponse.json({ ok: true, armed: null });
}
